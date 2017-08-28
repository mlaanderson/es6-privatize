# es6-privatize
Privatizes es6 and es7 classes with minimal overhead

# Options
The options object has three properties:
* warn - boolean value which indicates if the Privatize function warns about possible data leakage
* privatePrefix - string value which precedes private members
* errorOnPrivate - boolean value which indicates if attempts to access private members will throw an exception. If false, they return undefined.

# Usage
~~~~
var Privatize = require('es6-privatize');

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
     * Used by Privatize to intercept inspection and present public data
     * to the user.
     * 
     * @see {@link https://nodejs.org/dist/latest-v8.x/docs/api/util.html#util_custom_inspection_functions_on_objects} for further information.
     * @param {number} depth 
     * @param {any} options 
     * @returns 
     * @memberof Person
     */
    inspect(depth, options) {
        if (depth < 0) {
            return options.stylize('[Person]', 'special');
        }

        var objData = {
            Name: this.Name,
            Age: this.Age
        };

        const newOptions = Object.assign({}, options, {
            depth: options.depth === null ? null : options.depth - 1
        });

        const padding = ' '.repeat(7);
        const inner = util.inspect(objData, newOptions).replace(/\n/g, '\n' + padding);
        return options.stylize('Person', 'special') + ' '+ inner;
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

michael.__age = '45';              // throws access exception
michael.Age = '45';                // throws TypeException
michael.Age = 45;                  // success
michael.__birthday();              // throws "undefined is not a function"
~~~~

# Notes
privatePrefix can contain reserved characters if you are willing to use brackets to access the private members from within your class. For easier 
implementation, stick with unreserved characters.
