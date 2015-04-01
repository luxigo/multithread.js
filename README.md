Multithread
===========

In-browser multithreading made easy.

Run any business logic you like without interrupting the user experience.

Multithread is a simple wrapper that eliminates the hassle of dealing with Web Workers and
transferable objects.

Run any code you'd like asynchronously, in its own thread, without interrupting the user experience.


Using Multithread
-----------------

Using Multithread is simple. Include multithread.js on any page you'd like using
```html
<script src="my/path/to/multithread.js"></script>
```

And instantiate it in any script tag using
```js
var num_threads = 2;
var MT = new Multithread(num_threads);
```

By default ```num_threads``` is set to the processor core count of the computer
you're using.


Running a Thread Asynchronously
-------------------------------

Run functions asynchronously in a separate thread, like this:
```js
MT.process({
  // default worker type when argument list > 2 is 'json'
  worker: function(arg1, arg2, ..., argN){},
  callback: function(returnValue){}
})(arg1, arg2, ..., argN);
```
or for example
```js
MT.process({
  // default worker type is 'transferable'
  worker: function(obj, transferable_item_list){},
  callback: function(obj){}
})({data: myInt8Array}, [myInt8Array.buffer]);
```

```.process()``` return a function object that will not execute until explicitly
told to do so:
```js
var funcInADifferentThread = MT.process({
  // json is the default type when worker arguments count > 2
  type: 'json',
  worker: function(a,b) { return a + b; },
  callback: function(result) { console.log(result) }
);

// Nothing has happened,
//funcInADifferentThread has not executed yet...

funcInADifferentThread(1, 2);
console.log('Before or after?');

// We now see "Before or after?" logged in the console,
// and "3" (= 1 + 2) logged shortly thereafter...
// it was running asynchronously
```


Special Data Types
------------------

Multithread.js can use JSON serialization with ```.process()``` (when type is set to 'json' or by default when argument count is greater than 2) so you can deal with your threaded, asynchronous functions like you'd deal with normal JavaScript functions.


However, optimized support is also provided for transferable objects (good for big typed arrays you dont want to be copied - see 'worker transferable object' on internet) as well as typed data, specifically ```int32``` and ```float64``` 
(being signed 32-bit integers and 64-bit floats, respectively).


You can access these using...

```js
// transferable objects (once transferred, items are no more referenced in the main thread)
MT.process({
  worker: function(obj, transferable_item_list){ 
    /* function body */
    return obj
  },
  callback: function(obj){
    /* main thread callback */
  }
})({ data: myBigTypedArray, otherStuff: ...  }, [myBigTypedArray.buffer, ...]);

// Only deal with 32-bit signed integers...
var threadedInt32Func = MT.process({
  type: 'int32',
  worker: function(int32_arg1, int32_arg2, ..., int32_argN) {
    /* function body */
  },
  callback: function(int32_returnValue1, int32_returnValue2, ..., int32_returnValueN) {
    /* main thread callback */
  }
});

// Only deal with 64-bit floats...
var threadedFloat64Func = MT.process(
  type: 'float64',
  .
  .
  .
```

The return from a ```int32``` or ```foat64``` worker type can be a single value or Array. 


Scope Warning
-------------

Keep in mind that any threaded function is **completely scope unaware**, meaning something like:
```js
function scopeCheck() {
  var scopeVar = 2;
  MT.process({
    worker: function() { return scopeVar + 2; },
    callback: function(r) { console.log('Cool'); }
  })();
}
scopeCheck();
```
Will throw ```ReferenceError: scopeVar is not defined```

However, **callbacks are scope aware**


Recursion
---------

You can accomplish recursion simply by naming your functions as you pass them to Multithread
```js
MT.process({
  type: 'json',
  worker: function Recurse(m, n) {
    if(n>0) {
      return Recurse(m + 1, n--);
    } else {
      return m;
    }
  },
  callback: function(r) {
    console.log(r);
  }
})(5, 2);

// This will increase m twice recursively and log "7"
```


Limitations
-----------

Be aware of the limitations of web workers. Read about them on internet.

All variables passed to functions must be JSON-serializable, meaning only Arrays, Objects, and base types (Number, String, Boolean, null). Same with return variables. No custom objects or prototypes.

Objects and Arrays, as passed to any threaded function, will be deep-copied (passed by value, not reference).

Only data buffers are not copied, when using 'transferable' worker type as shown above.

Additionally, threaded functions do not have access to the DOM.


Thank You
---------

Thanks, and have fun! :)

Feedback is always appreciated. (Stars, forks, criticisms, you name it!)

Author: 
  Keith Whor (http://twitter.com/keithwhor,   http://keithwhor.com/)

Contributor:
  Luc Deschenaux (http://github.com/luxigo)
