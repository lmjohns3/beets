import axios from 'axios'
import Dexie from 'dexie'
import moment from 'moment'

const DB = new Dexie('beets')


DB.version(1).stores({
  history: "++id,item,when,action",
  state: "++id",
})


const addHistory = (item, action) => {
  DB.history.add({
    item: item,
    action: action,
    when: moment(),
  });
}


export {DB, addHistory}
