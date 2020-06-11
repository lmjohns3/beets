import axios from 'axios'
import React, {useEffect, useState} from 'react'

const MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];


const Library = ({items, queue}) => {
  let current = null;
  const children = [];
  items.forEach(item => {
    if (item.sep !== current) {
      current = item.sep;
      children.push(<div key={`sep-${current}`} className='sep'><a name={current}>{current}</a></div>);
    }
    children.push(
      item.album
      ? <Album key={item.key} album={item.album} queue={queue} />
      : <Song key={item.key} song={item.song} queue={queue} />);
  });

  return <div className='library'>{children}</div>;
}


const Album = ({album, queue}) => <div className='album' onClick={
    () => axios(`/item/query/album_id:${album.id}`).then(res => queue(res.data.results))
  }>
  <div className='art' style={{backgroundImage: `url(/album/${album.id}/art)`}}></div>
  <div className='about'>
    <div className='meta'>
      {album.year === 0 ? null : <div className='when'>{`${MONTHS[album.month]} ${album.year}`}</div>}
      {album.genre === '' ? null : <div className='genre'>{album.genre}</div>}
    </div>
    <div className='artist'>{album.albumartist}</div>
    <div className='title'>{album.album}</div>
  </div>
</div>


const Song = ({song, queue}) => <div className='song' onClick={() => queue([song])}>
  <div className='art' style={{background: 'hsl(0, 50%, 80%)'}}></div>
  <div className='about'>
    <div className='meta'>
      {song.year === 0 ? null : <div className='when'>{`${MONTHS[song.month]} ${song.year}`}</div>}
      {song.genre === '' ? null : <div className='genre'>{song.genre}</div>}
    </div>
    <div className='artist'>{song.artist}</div>
    <div className='title'>{song.title}</div>
  </div>
</div>



export default Library
