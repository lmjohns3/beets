"use strict";

(function() {

const db = new Dexie("beets");

db.version(1).stores({
    history: "++id,item_id,when,action",
    state: "++id",
});

/*
 * APP -- manages app state, ties together playlist + library.
 */

class App extends React.Component {
    constructor() {
        super();

        this.state = {
            playlist: [],
            current: -1,
            player: {playing: false},
        };

        this.clear = this.clear.bind(this);
        this.add = this.add.bind(this);
        this.shuffle = this.shuffle.bind(this);
        this.remove = this.remove.bind(this);
        this.toggle = this.toggle.bind(this);
        this.setCurrent = this.setCurrent.bind(this);

        this.audio = document.getElementById("audio");
        const update = () => {
            let buffered = 0;
            if (this.audio.buffered) {
                for (let i = 0; i < this.audio.buffered.length; ++i) {
                    buffered = Math.max(buffered, this.audio.buffered.end(i));
                }
            }
            const nanguard = f => isNaN(f) ? -1 : f;
            this.setState({player: {
                duration: nanguard(this.audio.duration),
                buffered: nanguard(buffered),
                currentTime: nanguard(this.audio.currentTime),
                playing: (this.audio &&
                          this.audio.currentTime > 0 &&
                          !this.audio.paused &&
                          !this.audio.ended &&
                          this.audio.readyState > 2),
            }});
        };
        this.audio.onplay = () => {
            const idx = this.state.current > 0 ? this.state.current - 1 : 0;
            const id = `item-${this.state.playlist[idx].id}`;
            document.getElementById(id).scrollIntoView();
            update();
        };
        this.audio.onended = () => this.setCurrent(this.state.current + 1);
        this.audio.onpause = update;
        this.audio.ondurationchange = update;
        this.audio.ontimeupdate = update;
    }

    clear() {
        this.setState({playlist: [], current: -1});
        this.audio.pause();
        this.audio.src = "";
    }

    add(items) {
        this.setState(state => {
            const update = {playlist: [...state.playlist, ...items]};
            if (state.playlist.length === 0) {
                this.audio.pause();
                this.audio.currentTime = 0;
                this.audio.src = `/item/${items[0].id}/file`;
                this.audio.play();
                update.current = 0;
            }
            return update;
        });
    }

    shuffle() {
        this.setState(state => {
            const rnd = () => 2 * (Math.random() < 0.5) - 1;
            return {playlist: state.playlist.sort(rnd)};
        });
    }

    toggle() {
        this.state.player.playing ? this.audio.pause() : this.audio.play();
    }

    remove(idx) {
        this.setState(state => {
            state.playlist.splice(idx, 1);
            if (state.playlist.length === 0)
                return {playlist: [], current: -1};
            return {
                playlist: state.playlist,
                current: Math.min(Math.max(0, state.current - 1),
                                  state.playlist.length - 1),
            };
        });
    }

    setCurrent(idx) {
        this.setState(state => {
            this.audio.pause();
            if (0 <= idx && idx < state.playlist.length) {
                this.audio.src = `/item/${state.playlist[idx].id}/file`;
                this.audio.play();
                return {current: idx};
            } else {
                this.audio.src = "";
                return {current: -1};
            }
        });
    }

    render() {
        return (
            <div id="app">
            <Playlist playlist={this.state.playlist}
                      current={this.state.current}
                      player={this.state.player}
                      toggle={this.toggle}
                      remove={this.remove}
                      setCurrent={this.setCurrent} />
            <LibraryContainer add={this.add} />
            </div>
        );
    }
}

/*
 * PLAYLIST -- list of playable library items.
 */

const Playlist = ({playlist, current, player, toggle, remove, setCurrent}) => (
    <ul id="playlist">{playlist.map((item, i) => (
        <li key={i}>
        <PlaylistItem item={item}
                      active={current === i}
                      playPause={current === i ? toggle :  () => setCurrent(i)}
                      remove={() => remove(i)}
                      player={player} />
        </li>
    ))}</ul>
)

class PlaylistItem extends React.Component {
    componentDidMount() {
        this._hammer = Hammer(this._el);
        this._hammer.on('swipe', this.props.remove);
    }

    componentWillUnmount() {
        this._hammer.off('swipe', this.props.remove);
        delete this._hammer;
    }

    render() {
        const {item, active, playPause, remove, player} = this.props;
        const timeFormat = s => {
            s = Math.round(s > 0 ? s : 0);
            return `${Math.floor(s / 60)}:${(s % 60) < 10 ? "0" : ""}${s % 60}`;
        };
        const timePercent = s => {
            const t = player.duration;
            return (s > 0 && t > 0) ?
                   (Math.round(Math.min(s / t, 1) * 10000) / 100) + "%" : "0%";
        };
        return (<div id={`item-${item.id}`}
                     ref={el => this._el = el}
                     onClick={playPause}
                     className={active ? "active item" : "item"}>
            <div className="art" style={{backgroundImage: `url(/album/${item.album_id}/art)`}}></div>
            <div className="title">{item.title}</div>
            <div className="artist">{item.artist}</div>
            {active && (<div>
                <div className="time">
                <div className="currentTime" style={{width: timePercent(player.currentTime)}}>
                    <span>{timeFormat(player.currentTime)}</span></div>
                <div className="buffered" style={{width: timePercent(player.buffered)}}></div>
                <div className="duration"><span>{timeFormat(player.duration)}</span></div>
                </div>
            </div>)}
        </div>);
    }
}

/*
 * LIBRARY -- albums and songs that match a query.
 */

class LibraryContainer extends React.Component {
    constructor(props) {
        super(props);
        this.state = {albums: [], songs: []};
        this.search = this.search.bind(this);
    }

    search(ev) {
        ev.preventDefault();
        location = `#${document.getElementById("q").value}`;
        this.refresh();
    }

    refresh() {
        const q = location.hash
                          .replace(/^#/, "")
                          .split(/[\/\s]+/)
                          .map(encodeURIComponent)
                          .join("/");
        if (q.length < 1) return;
        fetch(`/album/query/${q}`)
            .then(res => res.json())
            .then(json => this.setState({albums: json.results}));
        const a = "album_id::^$";
        fetch(`/item/query/${a}/${q}`)
            .then(res => res.json())
            .then(json => this.setState({songs: json.results}));
    }

    componentDidMount() {
        this.refresh();
    }

    render() {
        return <Library albums={this.state.albums}
                        songs={this.state.songs}
                        add={this.props.add}
                        search={this.search} />;
    }
}

const Library = ({albums, songs, add, search}) => (
    <div id="library">
        <form id="search" onSubmit={search}>
        <input type="text" id="q" placeholder="Search" />
        </form>
        <ul id="albums">{albums.map(album => (
            <li key={album.id}>
            <AlbumContainer album={album} add={add} />
            </li>
        ))}</ul>
        <ul id="songs">{songs.map(song => (
            <li key={song.id}><Song song={song} add={add} /></li>
        ))}</ul>
    </div>
)

class AlbumContainer extends React.Component {
    constructor(props) {
        super(props);
        this.state = {tracks: []};
    }

    componentDidMount() {
        fetch(`/item/query/album_id:${this.props.album.id}`)
            .then(res => res.json())
            .then(json => this.setState({tracks: json.results}));
    }

    render() {
        return <Album album={this.props.album}
                      tracks={this.state.tracks}
                      add={this.props.add} />;
    }
}

const Album = ({album, tracks, add}) => (
  <div className="album">
    <div onClick={() => add(tracks)} className="art"
         style={{backgroundImage: `url(/album/${album.id}/art)`}}></div>
    <div onClick={() => add(tracks)} className="title">{album.album}</div>
    <div onClick={() => add(tracks)} className="artist">{album.albumartist}</div>
    <ul className="tracks">{tracks.map((track) => {
        const title = <div className="title">{track.title}</div>;
        const artist = track.artist === track.albumartist ?
                       "" : <div className="artist">{track.artist}</div>;
        return <li className="track"
                   onClick={() => add([track])}
                   key={track.id}>{title}{artist}</li>;
    })}</ul>
  </div>
)

const Song = ({song, add}) => {
    const title = <div className="title">{song.title}</div>;
    const artist = song.artist === song.albumartist ?
                   "" : <div className="artist">{song.artist}</div>;
    return <div className="song" onClick={() => add([song])}>{title}{artist}</div>;
}

ReactDOM.render(<App />, document.getElementById("root"));
})()
