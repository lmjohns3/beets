import axios from 'axios'
import React, {useEffect, useState} from 'react'

const MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];


const Library = ({items, queue}) => {
  let current = null;
  const children = [];
  items.forEach(item => {
    if (item.section !== current) {
      current = item.section;
      children.push(<div key={`section-${current}`} className='section'><a name={current}>{current}</a></div>);
    }
    children.push(
      item.album
      ? <Album key={`album-${item.id}-${item.sortKey}`} album={item} queue={queue} />
      : <Song key={`song-${item.id}-${item.sortKey}`} song={item} queue={queue} />);
  });

  return <div className='library'>{children}</div>;
}


const Album = ({album, queue}) => {
  const [hue, setHue] = useState(0);

  useEffect(() => { setHue(360 * Math.random()) }, []);

  return <div className='album' onClick={
    () => axios(`/item/query/album_id:${album.id}`).then(res => queue(res.data.results))
  }>
    <div className='art' style={{
      backgroundColor: `hsl(${hue}, 50%, 40%)`,
      backgroundImage: `url(/album/${album.id}/art)`,
    }}></div>
    <div className='about'>
      <div className='meta'><span className='genre'>{album.genre}</span></div>
      <div className='artist'>{album.albumartist}</div>
      <div className='title'>{album.album}</div>
    </div>
  </div>;
}


const Song = ({song, queue}) => <div className='song' onClick={() => queue([song])}>
  <div className='art' style={{background: 'hsl(0, 50%, 80%)'}}></div>
  <div className='about'>
    <div className='meta'><span className='genre'>{song.genre}</span></div>
    <div className='artist'>{song.artist}</div>
    <div className='title'>{song.title}</div>
  </div>
</div>



export default Library
