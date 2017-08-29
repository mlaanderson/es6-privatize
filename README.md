# es6-privatize
Privatizes es6 and es7 classes with minimal overhead

# Options
The options object has three properties:
* warn - boolean value which indicates if the Privatize function warns about possible data leakage. Default: true
* privatePrefix - string value which precedes private members. Default: __
* errorOnPrivate - boolean value which indicates if attempts to access private members will throw an exception. If false, they return undefined. Default: false
* apply - boolean value which indicates if the Privatize function can implement the ProxyHandler.apply function. Default: true
* construct -  boolean value which indicates if the Privatize function can implement the ProxyHandler.construct function. Default: true
* defineProperty -  boolean value which indicates if the Privatize function can implement the ProxyHandler.defineProperty function. Default: false
* deleteProperty -  boolean value which indicates if the Privatize function can implement the ProxyHandler.deleteProperty function. Default: false
* getOwnPropertyDescriptor -  boolean value which indicates if the Privatize function can implement the ProxyHandler.getOwnPropertyDescriptor function. Default: true
* getPrototypeOf -  boolean value which indicates if the Privatize function can implement the ProxyHandler.getPrototypeOf function. Default: true
* has -  boolean value which indicates if the Privatize function can implement the ProxyHandler.has function. Default: true
* isExtensible -  boolean value which indicates if the Privatize function can implement the ProxyHandler.isExtensible function. Default: false
* ownKeys -  boolean value which indicates if the Privatize function can implement the ProxyHandler.ownKeys function. Default: true
* preventExtensions -  boolean value which indicates if the Privatize function can implement the ProxyHandler.preventExtensions function. Default: true
* setPrototypeOf -  boolean value which indicates if the Privatize function can implement the ProxyHandler.setPrototypeOf function. Default: false

# Usage
~~~~
var Privatize = require('es6-privatize');
var util = require('util');

class Person {
    constructor(name, age) {
        this.__name = name;
        this.__age = age;

        return Privatize(this, { 
            warn: true, 
            privatePrefix: '__',
            errorOnPrivate: false
        });
    }

    /* Private variables and methods start with '__' (defined by options.privatePrefix) */

    __birthday() {
        this.__age ++;
    }

    /* These methods are needed to intercept reflection attempts */

    /**
     * Return a map of public property names to private data names. This
     * allows Privatize to intercept Object.keys, Object.getOwnPropertyDescriptor,
     * Object.getOwnPropertyDescriptors, and Object.getOwnPropertyNames
     * 
     * @returns 
     * @memberof Person
     */
    __privatize__keyMap() {
        return {
            'Age': '__age',
            'Name': '__name'
        };
    }

    /**
     * Used by Privatize to intercept JSON.stringify and return JSON
     * data to represent the publically available data.
     * 
     * @returns {any} 
     * @memberof Person
     */
    toJSON() {
        return {
            Name: this.Name,
            Age: this.Age
        };
    }

    /** Public Methods */

    get Name() {
        return this.__name;
    }

    set Name(value) {
        if (typeof value !== 'string') {
            throw new TypeError();
        }
        this.__name = value;
    }

    get Age() {
        return this.__age;
    }

    set Age(value) {
        if (typeof value !== 'number') {
            throw new TypeError();
        }
        this.__age = value;
    }
}

var michael = new Person('Michael Anderson', 42);

console.log(michael.__age);        // undefined
console.log('__age' in michael);   // false
console.log(Object.keys(michael)); // [ Age, Name ]

michael.__age = '45';              // fails silently (same as undefined = '45')
michael.Age = '45';                // throws TypeError("Invalid Type")
michael.Age = 45;                  // success
michael.__birthday();              // throws TypeError("michael.__birthday is not a function")
~~~~

# Notes
privatePrefix can contain reserved characters if you are willing to use brackets to access the private members from within your class. For easier 
implementation, stick with unreserved characters.
