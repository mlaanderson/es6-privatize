const assert = require('assert');

var OptionsMap = new WeakMap();

var handler = {
    get: function(target, name) { 
        if (typeof name === 'string' && name.startsWith(OptionsMap.get(target).privatePrefix)) {
            if (OptionsMap.get(target).errorOnPrivate === true) {
                throw new Error('Private member access not allowed');
            }
            return undefined;
        }
        return target[name];
    },

    set: function(target, name, value) {
        if (typeof name === 'string' && name.startsWith(OptionsMap.get(target).privatePrefix)) {
            if (OptionsMap.get(target).errorOnPrivate === true) {
                throw new Error('Private member access not allowed');
            }
            return undefined;
        }
        return target[name] = value;
    },

    has: function(target, name) {
        if (typeof name === 'string' && name.startsWith(OptionsMap.get(target).privatePrefix)) {
            return false;
        }
        return name in target;
    },

    ownKeys: function(target) {
        if (OptionsMap.get(target).privatePrefix + 'privatize__keyMap' in target === false) {
            if (OptionsMap.get(target).warn === true) {
                console.warn('Private keys may be visible');
            }
            return Object.getOwnPropertyNames(target);
        }
        return Object.getOwnPropertyNames(target[OptionsMap.get(target).privatePrefix + 'privatize__keyMap']());
    },

    getOwnPropertyDescriptor: function(target, name) {
        if (OptionsMap.get(target).privatePrefix + 'privatize__keyMap' in target === false) {
            if (OptionsMap.get(target).warn === true) {
                console.warn('Private data may be visible');
            }
            return Object.getOwnPropertyDescriptor(target, name);
        }
        if (name in target[OptionsMap.get(target).privatePrefix + 'privatize__keyMap']()) {
            return Object.getOwnPropertyDescriptor(target, target[OptionsMap.get(target).privatePrefix + 'privatize__keyMap']()[name]);
        }
        return undefined;
    }
}

function Privatize(target, options) {
    options = Object.assign({ 
        warn: true, 
        errorOnPrivate: false,
        privatePrefix: '__'
    }, options);

    OptionsMap.set(target, options);
    
    if (options.warn && (options.privatePrefix + 'privatize__keyMap' in target === false)) {
        console.warn('Private data might be able to be exposed');
    }
    if (options.warn && ('inspect' in target === false || typeof target.inspect !== 'function')) {
        console.warn('"inspect" method needed to present getters as properties (https://nodejs.org/dist/latest-v8.x/docs/api/util.html#util_custom_inspection_functions_on_objects)');
    }
    if (options.warn && ('toJSON' in target === false)) {
        console.warn('"toJSON" method needed to allow serialization of getters as properties');
    }

    return new Proxy(target, handler);
}

module.exports = Privatize;

if (require.main === module) {
    class Person {
        constructor(name, age) {
            this.$$name = name;
            this.$$age = age;

            return Privatize(this, { 
                warn: true,
                privatePrefix: '$$'
            });
        }

        $$birthday() {
            this.$$age ++;
        }

        $$privatize__keyMap() {
            return {
                'Age': '$$age',
                'Name': '$$name'
            };
        }

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

        toJSON() {
            return {
                Name: this.Name,
                Age: this.Age
            };
        }

        get Name() {
            return this.$$name;
        }

        set Name(value) {
            if (typeof value !== 'string') {
                throw new TypeError();
            }
            this.$$name = value;
        }

        get Age() {
            return this.$$age;
        }
    
        set Age(value) {
            if (typeof value !== 'number') {
                throw new TypeError();
            }
            this.$$age = value;
        }
    }

    var michael;
    try {
        try {
            michael = new Person('Michael Anderson', 42);
        } catch (err) { console.log(err);
            assert(false, 'Failure creating new Person');
        }
        assert(michael.$$age === undefined, 'Private prefix is not recognized');
        assert(michael.Age === 42, 'Public accessors being intercepted');
        assert(Object.keys(michael).join() === 'Age,Name', 'Object.keys not intercepted');
        assert(Object.getOwnPropertyDescriptor(michael, '$$name') === undefined, 'Object.getOwnPropertyDescriptor not intercepted properly');
        assert(Object.getOwnPropertyDescriptor(michael, 'Name').value === 'Michael Anderson', 'Object.getOwnPropertyDescriptor not intercepted properly');
        assert(Object.getOwnPropertyNames(michael).join() === 'Age,Name', 'Object.getOwnPropertyNames not intercepted properly');
        assert('$$name' in michael === false, 'Reflect.has not intercepted properly');
        assert(JSON.stringify(michael) === '{"Name":"Michael Anderson","Age":42}', 'toJSON not intercepted properly');
    } catch (error) {
        console.log(error.message);
        process.exit(1);
    }
}