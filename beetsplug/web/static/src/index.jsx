import axios from 'axios'
import React, {useEffect, useState} from 'react'
import ReactDOM from 'react-dom'

import Library from './library'
import Playlist from './playlist'

import './beets.styl'


const norm = s =>
  s === null || s === '' ? '∅' : s.normalize('NFD')
                                  .replace(/[\u0300-\u036f]/g, '')
                                  .replace(/Æ/, 'e')
                                  .replace(/^['‘\(\)\[\]]+/, '')
                                  .replace(/^(a|an|the)\s+/i, '')
                                  .toLowerCase()

const nearest5 = s => s - s % 5

const yyyyMmDd = s => s.year > 0 ? `${s.year}-${s.month}-${s.day}` : null


const App = () => {
  const [playlist, setPlaylist] = useState([])
      , [albums, setAlbums] = useState([])
      , [songs, setSongs] = useState([])
      , [order, setOrder] = useState('title')
      , [library, setLibrary] = useState([]);

  useEffect(() => {
    // Load albums, and songs that have no associated album.
    axios('/album/query/').then(res => setAlbums(res.data.albums));
    axios('/item/query/album::^$').then(res => setSongs(res.data.results));
  }, []);

  useEffect(() => {
    const lib = []
         , getSection = s => s === null || s === '' ? '∅'
                           : order === 'date' ? `${nearest5(parseInt(s.slice(0, 4)))}`
                           : order === 'genre' ? s
                           : s[0]
        , add = (idx, item) => lib.push({
          ...item,
          sortKey: norm(idx),
          section: getSection(norm(idx)),
          genre: order === 'genre' ? idx : item.genre,
        });
    albums.forEach(album => {
      const index =
          order === 'artist' ? [`${album.albumartist_sort}${album.albumartist}`]
        : order === 'date' ? [yyyyMmDd(album)]
        : order === 'genre' ? album.genre.split(/, */)
        : [album.album];
      index.forEach(idx => add(idx, album));
    });
    songs.forEach(song => {
      const index =
          order === 'artist' ? [`${song.artist_sort}${song.artist}`]
        : order === 'date' ? [yyyyMmDd(song)]
        : order === 'genre' ? song.genre.split(/, */)
        : [song.title];
      index.forEach(idx => add(idx, song));
    });
    setLibrary(lib.sort((a, b) => a.sortKey < b.sortKey ? -1 : a.sortKey > b.sortKey ? 1 : 0));
  }, [order, albums, songs]);

  return <div className={`app playlist${playlist.length}`}>
    <nav>
      <a key='date' className={order === 'date' ? 'order' : ''} onClick={() => setOrder('date')}>📅 Year</a>
      <a key='artist' className={order === 'artist' ? 'order' : ''} onClick={() => setOrder('artist')}>🧑 Artist</a>
      <a key='title' className={order === 'title' ? 'order' : ''} onClick={() => setOrder('title')}>💿 Album</a>
      <a key='genre' className={order === 'genre' ? 'order' : ''} onClick={() => setOrder('genre')}>🎸️ Genre</a>
    </nav>
    <Playlist items={playlist} setItems={setPlaylist} />
    <Library items={library} queue={items => setPlaylist(cur => [...cur, ...items])} />
  </div>;
}


ReactDOM.render(<App />, document.getElementById('root'))
