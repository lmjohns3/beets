import axios from 'axios'
import React, {useEffect, useState} from 'react'
import ReactDOM from 'react-dom'

import Library from './library'
import Playlist from './playlist'

import './beets.styl'


const norm = s => (s > '' ? s : '∅').toUpperCase()
                                    .replace(/^\W+/, '')
                                    .replace(/^(A|AN|THE)\s+/, '');


const App = () => {
  const [playlist, setPlaylist] = useState([])
      , [albums, setAlbums] = useState([])
      , [songs, setSongs] = useState([])
      , [order, setOrder] = useState('title')
      , [library, setLibrary] = useState([])
      , [index, setIndex] = useState([]);

  useEffect(() => {
    // Load albums, and songs that have no associated album.
    axios('/album/query/').then(res => setAlbums(res.data.albums.map(
      album => ({key: `album-${album.id}`, album: album})
    )));
    axios('/item/query/album::^$').then(res => setSongs(res.data.results.map(
      song => ({key: `song-${song.id}`, song: song})
    )));
  }, []);

  useEffect(() => {
    let indexAlbum = a => a.album.album;
    let indexSong = s => s.song.title;
    let getSep = s => s[0];
    if (order === 'date') {
      indexAlbum = a => a.album.year > 0 ? `${a.album.year}-${a.album.month}-${a.album.day}` : null;
      indexSong = s => s.song.year > 0 ? `${s.song.year}-${s.song.month}-${s.song.day}` : null;
      getSep = s => s ? `${s.slice(0, 3)}0s` : '∅';
    }
    if (order === 'genre') {
      indexAlbum = a => a.album.genre;
      indexSong = s => s.song.genre;
    }
    if (order === 'artist') {
      indexAlbum = a => `${a.album.albumartist_sort}${a.album.albumartist}`;
      indexSong = s => `${s.song.artist_sort}${s.song.artist}`;
    }
    albums.forEach(album => {
      const sort = norm(indexAlbum(album));
      album.sep = getSep(sort);
      album.sort = sort;
    });
    songs.forEach(song => {
      const sort = norm(indexSong(song));
      song.sep = getSep(sort);
      song.sort = sort;
    });
    setIndex([...new Set([...albums, ...songs].map(x => x.sep))].sort());
    setLibrary([...albums, ...songs].sort(
      (a, b) => a.sort < b.sort ? -1 : a.sort > b.sort ? 1 : 0));
  }, [order, albums, songs]);

  return <div className={`app playlist${playlist.length}`}>
    <nav>
      <a key='date' className={order === 'date' ? 'order' : ''} onClick={() => setOrder('date')}>📅</a>
      <a key='artist' className={order === 'artist' ? 'order' : ''} onClick={() => setOrder('artist')}>🧑‍🎤</a>
      <a key='title' className={order === 'title' ? 'order' : ''} onClick={() => setOrder('title')}>💿</a>
      <a key='genre' className={order === 'genre' ? 'order' : ''} onClick={() => setOrder('genre')}>🎸️</a>
      {index.map(i => <a key={`idx-${i}`} href={`#${i}`}>{i}</a>)}
    </nav>
    <Playlist items={playlist} setItems={setPlaylist} />
    <Library items={library} queue={items => setPlaylist(cur => [...cur, ...items])} />
  </div>;
}


ReactDOM.render(<App />, document.getElementById('root'))