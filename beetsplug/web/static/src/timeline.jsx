import axios from 'axios'
import moment from 'moment'
import React, {useEffect, useState} from 'react'
import InfiniteScroll from 'react-infinite-scroll-component'
import {useHistory} from 'react-router-dom'
import SunCalc from 'suncalc'

import {create} from './db'
import {withGeo} from './common'

import './timeline.styl'

const DAY_HEIGHT = 47;
const LONG_PRESS_DELAY = 700;


export default function Timeline() {
  const [events, setEvents] = useState([])
      , [days, setDays] = useState([]);

  const parseEvent = event => ({
    ...event,
    utctime: moment.utc(event.utc),
    localtime: moment.utc(event.utc).add(event.offset, 'm').clone(),
  });

  const cr = args => create(args).then(
    res => setEvents(cur => [...cur, parseEvent(res.data)]));

  const createMoreDays = () => {
    const today = moment.utc().startOf('day')
        , cur = days.length > 0 ? days[days.length - 1].clone().subtract(1, 'd') : today
        , newDays = [];
    for (let i = 0; i < 100; i++) {
      newDays.push(cur.clone());
      cur.subtract(1, 'd');
    }
    setDays(curDays => [...curDays, ...newDays]);
    axios('/rest/events/', {params: {
      start: newDays[newDays.length - 1].format(),
      end: newDays[0].clone().add(1, 'd').format(),
    }}).then(res => setEvents(current => {
      res.data.forEach(event => current.push(parseEvent(event)));
      return [...current];
    }));
  };
  useEffect(createMoreDays, []);

  return <div className='timeline'>
    <div className='abs tick' style={{left: '12.5%'}}>&nbsp;</div>
    <div className='abs tick' style={{left: '25%'}}>&nbsp;</div>
    <div className='abs tick' style={{left: '37.5%'}}>&nbsp;</div>
    <div className='abs tick' style={{left: '50%'}}>&nbsp;</div>
    <div className='abs tick' style={{right: '37.5%'}}>&nbsp;</div>
    <div className='abs tick' style={{right: '25%'}}>&nbsp;</div>
    <div className='abs tick' style={{right: '12.5%'}}>&nbsp;</div>
    <InfiniteScroll className='days' dataLength={days.length} hasMore={true} next={createMoreDays}>{
      days.map((utc, idx) => {
        const yyyymmdd = utc.format('YYYY-MM-DD')
            , ev = events.filter(e => e.utc.startsWith(yyyymmdd))
            , key = `${yyyymmdd}--${ev.length}`;
        return <Day key={key} idx={idx} utc={utc} create={cr} events={ev} />
      })
    }</InfiniteScroll>
  </div>;
}


const pct = (begin, end) => `${end.diff(begin) / 864000}%`
const percents = (left, begin, end) => ({left: pct(left, begin), width: pct(begin, end)})


const sunMoments = (utc, geo) => {
  const asMoments = {};
  if (geo && geo.lat && geo.lng) {
    const asDates = SunCalc.getTimes(utc.toDate(), geo.lat, geo.lng);
    Object.keys(asDates).forEach(key => { asMoments[key] = moment(asDates[key]).utc() });
  }
  return asMoments;
}


const Day = ({utc, idx, events, create}) => {
  const start = utc.clone().startOf('day')
      , end = utc.clone().endOf('day')
      , [now, setNow] = useState(moment.utc())
      , offset = moment().utcOffset()
      , eventsWithGeo = events.filter(e => (e.lat && e.lng))
      , eventGeos = eventsWithGeo.map(e => ({lat: e.lat, lng: e.lng}))
      , sunGeo = eventGeos.length > 0 ? eventGeos[0] : null // {lat: 0.1, lng: 0.1}
      , yest = sunMoments(utc.clone().subtract(1, 'd'), sunGeo)
      , today = sunMoments(utc, sunGeo)
      , tmrw = sunMoments(utc.clone().add(1, 'd'), sunGeo)
      , after = sunMoments(utc.clone().add(2, 'd'), sunGeo)
      , [singletons, setSingletons] = useState([])
      , [spans, setSpans] = useState([]);

  // Group events into spans (if applicable) and singletons (not part of a span).
  useEffect(() => {
    const spns = {}, sing = [];
    events.forEach(event => {
      if (event.span && event.span.id) {
        const k = event.span.id;
        if (!spns[k]) {
          spns[k] = event.span;
        }
        for (let e = 0; e < spns[k].events.length; e++) {
          if (spns[k].events[e].id === event.id) {
            spns[k].events[e] = event;
            break;
          }
        }
      } else {
        sing.push(event);
      }
    });
    setSpans(Object.values(spns));
    setSingletons(sing);
  }, [events.length]);

  // Use geolocation when creating a new event or span.
  const cr = args => withGeo(
    ({lat, lng}) => create({lat, lng, utcdate: start.clone(), ...args}));

  // Rerender the current day every 5min.
  useEffect(() => {
    if (idx === 0) {
      const int = setInterval(() => setNow(moment.utc()), 5 * 1000);
      return () => clearInterval(int);
    }
  }, [idx]);

  return <div className={`day ${utc.format('dddd')} ${utc.format('MMMM')} the-${utc.format('Do')}`}>
    {today.sunset ? <>
      <div className='dark abs' style={percents(start, today.sunset, tmrw.sunrise)}>&nbsp;</div>
      <div className='dark abs' style={percents(start, tmrw.sunset, after.sunrise)}>&nbsp;</div>
    </> : null}
    <span className='label abs'>{utc.format(utc.date() === 1 ? 'D MMM YYYY' : 'D')}</span>
    {spans.map(span => <Span key={span.id} span={span} create={cr} />)}
    {singletons.map(event => <Event className='singleton' key={event.id} event={event} create={cr} />)}
  </div>;
}


const Span = ({span, create}) => {
  const times = span.events.map(e => moment.utc(e.utc))
      , todayEvents = span.events.filter(e => !!e.utctime)
      , events = todayEvents.sort(
        (a, b) => a.utctime.isBefore(b.utctime) ? -1 : a.utctime.isAfter(b.utctime) ? 1 : 0
      ).map((event, idx) => {
        const last = span.events.length - 1
        return <Event key={event.id}
                      event={event}
                      className={`event idx${idx} ridx${last - idx}`}
                      create={args => create({spanid: span.id, offset: event.offset, ...args})} />;
      })
      , end = moment.min(moment.utc(),
                         moment.utc(moment.min(...times)).add(12, 'h'),
                         moment.utc(moment.min(...times)).endOf('day').subtract(1, 'h'));
  return span.events.length === 0 ? null : <div className='span'>
    <div className='duration abs' style={percents(
      moment.min(...todayEvents.map(e => e.utctime)).clone().startOf('day'),
      moment.min(...times),
      span.events.length === 1 ? end : moment.max(...times))} />
    {events}
    {span.events.length > 1 ? null :
      <Event className='tentative' key='end' utc={end}
             create={args => create({spanid: span.id, offset: span.events[0].offset, ...args})} />}
  </div>;
}


const Event = ({event, utc, className, create}) => {
  const history = useHistory()
      , u = utc || event.utctime
      , [clickStart, setClickStart] = useState(null)
      , [startPosition, setStartPosition] = useState(null)
      , [delta, setDelta] = useState({d: 0, m: 0});

  useEffect(() => {
    const handler = e => {
      e.preventDefault();
      const elapsed = moment.utc().diff(clickStart)
          , x = e.type === 'touchmove' ? e.touches[0].pageX : e.clientX
          , y = e.type === 'touchmove' ? e.touches[0].pageY : e.clientY;
      if (elapsed > LONG_PRESS_DELAY) {
        setDelta({d: Math.round((y - startPosition.y) / DAY_HEIGHT),
                  m: 1440 * (x - startPosition.x) / window.innerWidth});
      }
    };
    if (clickStart) {
      window.addEventListener('mousemove', handler);
      window.addEventListener('touchmove', handler);
      return () => {
        window.removeEventListener('mousemove', handler);
        window.removeEventListener('touchmove', handler);
      };
    }
  }, [clickStart]);

  const onMouseDown = e => {
    if (e.button !== 0) return;
    e.preventDefault();
    setClickStart(moment.utc());
    const x = e.type === 'touchstart' ? e.touches[0].pageX : e.clientX
        , y = e.type === 'touchstart' ? e.touches[0].pageY : e.clientY;
    setStartPosition(xy => xy || {x, y});
  };

  const onMouseUp = e => {
    if (e.button !== 0) return;
    e.preventDefault();
    if (!event) {
      // If this is a placeholder, create an event here.
      create({utc: u.clone().add(delta.m, 'm')});
    } else if (moment.utc().diff(clickStart) > LONG_PRESS_DELAY) {
      // If we're dragging, update the event with the new time.
      axios.post(`/rest/events/${event.id}/`, {
        utc: event.utctime.clone().add(delta.m - 1440 * delta.d, 'm').format(),
      });
    } else if (event.span && event.span.workout) {
      // If this event is part of a workout, view the workout.
      history.push(`/workout/${event.span.id}/`);
    } else {
      // Add a note/mood for this event.
      history.push(`/note/${event.id}/`);
    }
    setClickStart(null);
  };

  const polarity = (event && event.mood) ? event.mood.polarity : 0
      , abs = 100 * Math.abs(polarity)
      , style = {
        left: pct(u.clone().startOf('day'), u.clone().add(delta.m, 'm')),
        top: `${DAY_HEIGHT * delta.d}px`,
        background: `hsl(${polarity > 0 ? 120 : 240}, ${abs}%, ${95 - abs / 2}%)`,
      };
  return <div className={`event abs ${className || ''}`} style={style}
              onMouseDown={onMouseDown} onMouseUp={onMouseUp}
              onTouchStart={onMouseDown} onTouchEnd={onMouseUp}>
    {event ? event.localtime.clone().add(delta.m - 1440 * delta.d, 'm').format('H:mm') : '?'}
  </div>;
}
