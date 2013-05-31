# level-window

levelup plugin for creating views on realtime time series data.

[![travis](https://travis-ci.org/dominictarr/level-window.png?branch=master)
](https://travis-ci.org/dominictarr/level-window)

[![testling](http://ci.testling.com/dominictarr/level-window.png)
](http://ci.testling.com/dominictarr/level-window)

To be used with [pull-window](https://github.com/dominictarr/pull-window)

<!--
## Example

Sum every 10 items stored into leveldb.

``` js
var level = require('level')
var levelup = require('level-sublevel')

var db = sublevel(level(path))

var Window = require('level-window')

var windowDb = Window(db, 'window', {
  count: 10,
  initial: 0,
  reduce: function (acc, val) {
    return acc + val
  }
})

//insert loads of data!
var ws = db.createWriteStream()
for(var i = 0; i < 100; i++) {
  ws.write({key: i, value: i, type: 'put'}) 
}
ws.end()
```

this will feed each group of 10 records into a window,
and reduce them together.

-->
## License

MIT
