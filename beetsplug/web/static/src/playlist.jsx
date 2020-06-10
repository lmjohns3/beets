import React, {useEffect, useRef, useState} from 'react'
import Swipeable from 'react-swipeable'

import {addHistory} from './db'


const timePercent = (t, T) => (t > 0 && T > 0) ? `${100 * t / T}%` : '0%'


const timeFormat = t => {
  t = Math.round(t > 0 ? t : 0);
  const m = `${t % 60}`.padStart(2, '0');
  return `${Math.floor(t / 60)}:${m}`;
}


const fisheryates = arr => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return [...arr];
}


const Playlist = ({items, setItems}) => {
  const audio = useRef(null)
      , [audioState, setAudioState] = useState({})
      , [current, setCurrent] = useState(-1);

  const shuffle = () => setItems(fisheryates);
  const remove = i => setItems(its => [...its.splice(i, 1)]);

  useEffect(() => {
    if (items.length > 0 && current < 0) {
      setCurrent(0);
    }
  }, [items]);

  useEffect(() => {
    if (!audio.current) return;
    const callback = verbose => () => {
      let buffered = 0;
      if (audio.current.buffered) {
        for (let i = 0; i < audio.current.buffered.length; ++i) {
          buffered = Math.max(buffered, audio.current.buffered.end(i));
        }
      }
      setAudioState(s => {
        console.log(s);
        return {
        currentTime: audio.current.currentTime,
        totalTime: audio.current.duration,
        bufferedTime: buffered,
        paused: audio.current.paused,
        playing: !audio.current.paused &&
                 !audio.current.ended &&
                 audio.current.currentTime > 0 &&
                 audio.current.readyState > 2,
      }});
    };
    audio.current.onplay = callback(true);
    audio.current.onpause = callback(true);
    audio.current.ontimeupdate = callback(false);
    audio.current.ondurationchange = callback(true);
  }, [audio.current]);

  useEffect(() => {
    if (!audio.current) return;
    if (!(0 <= current && current < items.length)) return;
    const item = items[current];
    audio.current.src = `/item/${item.id}/file`;
    audio.current.onended = () => {
      addHistory(item, 'play');
      if (current < items.length - 1) setCurrent(c => c + 1);
    }
    audio.current.play();
    return () => {
      audio.current.onended = null;
      audio.current.currentTime = 0;
      audio.current.src = '';
      audio.current.load();
    }
  }, [audio.current, current]);

  return <div className='playlist'>
    <audio key='audio' ref={audio} />
    <span key='clear' className='clear' onClick={() => setItems([])}>&times;</span>
    {items.map((item, i) => <Item key={`${item.id}-${i}`}
                                  item={item}
                                  isActive={current === i}
                                  setActive={() => setCurrent(i)}
                                  audio={{current: audio.current, ...audioState}} />)}
  </div>;
}


const Item = ({item, isActive, setActive, audio}) => {
  const playPause = () => audio.current.paused ? audio.current.play() : audio.current.pause();
  return <div className={isActive ? 'active item' : 'item'}
              onClick={isActive ? playPause : setActive}>
    <div className='art' style={{backgroundImage: `url(/album/${item.album_id}/art)`}}></div>
    <div className='title'>{item.title}</div>
    <div className='artist'>{item.artist}</div>
    {isActive ? <div className='playing'>
      <span className='current bar' style={{
        width: timePercent(audio.currentTime, audio.totalTime),
      }}>
        <span className='label'>{timeFormat(audio.currentTime)}</span>
      </span>
      <span className='buffered bar' style={{
        width: timePercent(audio.bufferedTime, audio.totalTime),
      }}></span>
      <span className='total bar'>
        <span className='label'>{timeFormat(audio.totalTime)}</span>
      </span>
   </div> : null}
  </div>
}


export default Playlist
