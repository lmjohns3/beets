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
    if (!audio.current) return;
    const callback = () => {
      let buffered = 0;
      if (audio.current.buffered) {
        for (let i = 0; i < audio.current.buffered.length; ++i) {
          buffered = Math.max(buffered, audio.current.buffered.end(i));
        }
      }
      setAudioState(s => ({
        currentTime: audio.current.currentTime,
        totalTime: audio.current.duration,
        bufferedTime: buffered,
        paused: audio.current.paused,
        playing: !audio.current.paused &&
                 !audio.current.ended &&
                 audio.current.currentTime > 0 &&
                 audio.current.readyState > 2,
      }));
    };
    audio.current.src = '';
    audio.current.load();
    audio.current.onplay = callback;
    audio.current.onpause = callback;
    audio.current.ontimeupdate = callback;
    audio.current.ondurationchange = callback;
  }, [audio.current]);

  useEffect(() => {
    if (!items || items.length === 0) {
      setCurrent(-1);
      return;
    }
    if (current < 0) {
      setCurrent(0);
      return;
    }
    audio.current.src = `/item/${items[current].id}/file`;
    audio.current.onended = () => {
      addHistory(items[current], 'play');
      if (current < items.length - 1) {
        setCurrent(current + 1);
      } else {
        setItems([]);
      }
    }
    audio.current.load();
    audio.current.play();
    return () => {
      audio.current.src = '';
      audio.current.load();
      audio.current.onended = null;
      audio.current.currentTime = 0;
    }
  }, [current, items]);

  return <div className='playlist'>
    <audio key='audio' ref={audio} prefetch='metadata' />
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
