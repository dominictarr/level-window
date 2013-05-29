
var pl = require('pull-level')
var pull = require('pull-stream')

module.exports = function (db, windowDb, opts, init) {

  if('string' === typeof windowDb)
    windowDb = db.sublevel(windowDb)

  var metaDb = windowDb.sublevel('meta')

  opts = opts || {}

  if('function' === typeof opts)
    opts = {reduce: opts, initial: init}

//  for each insert, merge into current window.
//  if the window is complete, save the window
//  and update the aggregate, starting the window over.
//
//  have some thing to reload the data when reopening the database...

  function cloneInitial () {
    if('function' === typeof opts.initial)
      return opts.initial()
    if(opts.initial == null)
      return null
    return opts.initial.constructor.call()
  }

  var acc = cloneInitial(), count = 0, latest = Date.now(), ready = false, timer = null, updated = false
  var max = null

  function timeWindow () {
    if(timer || !opts.time) return

    timer = setTimeout(function () {
      timer = null
      if(!updated) return

      windowDb.batch([
        {key: latest, value: acc, type: 'put', prefix: windowDb},
        {key: 'latest', value: {ts: latest, key: last.key}, type: 'put', prefix: metaDb}
      ], function (err) {
        if(err) return windowDb.emit('error', error)
      })

      acc = cloneInitial()
    }, opts.time)
  }

  function onData (op, add) {
    if(op.type === 'del') return
    if(max && max > opts.key)
      return console.error('level-window expects all updates to be appends')

    updated = true

    max = op.key
    acc = opts.reduce(acc, op.value)
    count ++
    var ts = Date.now()

    if((opts.count && opts.count <= count)
    || (opts.time && opts.time <= ts - latest)) {
      updated = false
      latest = ts; count = 0
      add({key: latest, value: acc, type: 'put', prefix: windowDb})
      add({key: 'latest', value: {ts: latest, key: op.key}, type: 'put', prefix: metaDb})
      acc = cloneInitial()
    }
    else
      timeWindow()
  }

  var first
  db.pre(function (op, add) {
    if(first == null)
      first = op.key
    onData(op, add)
  })
  
  metaDb.get('latest', function (err, data) {
    var last, n = 0

    //if there is no saved data, read from the start.
    pl.read(db, {min: data ? data.key : null})
      .pipe(pull.take(function (e) {
        return first == null || e.key < first
      }))
      .pipe(pull.through(function (e) {
        last = e, n++
      }))
      .pipe(pull.reduce(opts.reduce, cloneInitial(), function (err, _acc) {
        if(err) return windowDb.emit('error', error)
        ready = true
        if(!n) return windowDb.emit('window_ready')

        windowDb.batch([
          {key: latest, value: _acc, type: 'put'},
          {key: 'latest', value: {ts: latest, key: last.key}, type: 'put', prefix: metaDb}
        ], function (err) {
          if(err) return windowDb.emit('error', error)
          windowDb.emit('window_ready')
        })
      }))
  })

  return windowDb
}

