const debug = require('debug')('privatize');
const assert = require('assert');
const util = require('util');

var OptionsMap = new WeakMap();

var handler = {
    apply: function(target, thisArg, argumentsList) {
        if (OptionsMap.get(target).apply === false) return undefined;
        debug('apply: %o, %o, %o', target, thisArg, argumentsList);

        return target.apply(thisArg, argumentsList);
    },

    construct: function(target, argumentsList, newTarget) {
        if (OptionsMap.get(target).construct === false) return undefined;
        debug('construct: %o, %o, %o', target, argumentsList, newTarget);

        return new target.constructor(argumentsList);
    },

    defineProperty: function(target, property, descriptor) {
        if (OptionsMap.get(target).defineProperty === false) return false;
        debug('defineProperty: %o, %o, %o', target, property, descriptor);

        try {
            Object.defineProperty(target, property, descriptor);
            return true;
        } catch (err) {
            return false;
        }
    },

    deleteProperty: function(target, property) {
        if (OptionsMap.get(target).deleteProperty === false) false;
        debug('deleteProperty: %o, %o', target, property);

        try {
            Object.deleteProperty(target, property);
            return true;
        } catch (err) {
            return false;
        }
    },

    get: function(target, name) { 
        debug('get: %o, %o', target, name);

        if (typeof name === 'string' && name.startsWith(OptionsMap.get(target).privatePrefix)) {
            debug('get: attempt to access private data');
            if (OptionsMap.get(target).errorOnPrivate === true) {
                throw new Error('Private member access not allowed');
            }
            return undefined;
        }

        if (name === 'inspect') {
            if ('inspect' in target) {
                return target.inspect;
            }

            debug('get: internal inspect method');
            return function(depth, options) {
                if (depth < 0) {
                    return options.stylize('[' + target.constructor.name + ']', 'special');
                }

                let objData;

                if ('toJSON' in target && typeof target.toJSON === 'function') {
                    objData = target.toJSON();
                } else {
                    objData = {};
                }

                const newOptions = Object.assign({}, options, {
                    depth: options.depth === null ? null : options.depth - 1
                });

                const padding = ' '.repeat(1 + target.constructor.name.length);
                const inner = util.inspect(objData, newOptions).replace(/\n/g, '\n' + padding);

                return options.stylize(this.constructor.name, 'special') + ' '+ inner;
            }
        }

        return target[name];
    },

    getOwnPropertyDescriptor: function(target, name) {
        if (OptionsMap.get(target).getOwnPropertyDescriptor === false) return undefined;
        debug('getOwnPropertyDescriptor: %o, %o', target, name);

        if (typeof name === 'string' && name.startsWith(OptionsMap.get(target).privatePrefix)) {
            debug('get: attempt to access private data');
            if (OptionsMap.get(target).errorOnPrivate === true) {
                throw new Error('Private member access not allowed');
            }
            return undefined;
        }

        if (OptionsMap.get(target).privatePrefix + 'privatize__keyMap' in target === false) {
            debug('getOwnPropertyDescriptor: no privatize_keyMap available');
            if (OptionsMap.get(target).warn === true) {
                console.warn('Private data may be visible');
            }
            return Object.getOwnPropertyDescriptor(target, name);
        }

        function getMappedDescriptor() {
            if (name in target[OptionsMap.get(target).privatePrefix + 'privatize__keyMap']()) {
                let mappedName = target[OptionsMap.get(target).privatePrefix + 'privatize__keyMap']()[name];
                let descriptor = Object.getOwnPropertyDescriptor(target, mappedName);
                return descriptor;
            }
            return undefined;
        }

        function getDirectDescriptor() {
            let descriptor = Object.getOwnPropertyDescriptor(target, name);
            return descriptor;
        }
        
        if (name in target) {
            let descriptor = getDirectDescriptor() || getMappedDescriptor();
            return descriptor;
        }
        
        return undefined;
    },

    getPrototypeOf: function(target) {
        if (OptionsMap.get(target).getPrototypeOf === false) return null;
        debug('getPrototypeOf: %o', target);

        return Object.getPrototypeOf(target);
    },

    has: function(target, name) {
        if (OptionsMap.get(target).has === false) return false;
        debug('has: %o, %o', target, name);

        if (typeof name === 'string' && name.startsWith(OptionsMap.get(target).privatePrefix)) {
            debug('has: attempt to access private member');
            return false;
        }
        return name in target;
    },

    isExtensible: function(target) {
        debug('isExtensible: %o', target);
        return OptionsMap.get(target).isExtensible;
    },

    ownKeys: function(target) {
        if (OptionsMap.get(target).ownKeys === false) return [];
        debug('ownKeys: %o', target);

        if (OptionsMap.get(target).privatePrefix + 'privatize__keyMap' in target === false) {
            if (OptionsMap.get(target).warn === true) {
                console.warn('Private keys may be visible');
            }
            debug('ownKeys: no privatize_keyMap available');
            return Object.getOwnPropertyNames(target);
        }
        return Object.getOwnPropertyNames(target[OptionsMap.get(target).privatePrefix + 'privatize__keyMap']());
    },

    preventExtensions: function(target) {
        debug('preventExtensions: %o', target);
        return OptionsMap.get(target).preventExtensions;
    },

    set: function(target, name, value) {
        debug('set: %o, %o, %o', target, name, value);
        if (typeof name === 'string' && name.startsWith(OptionsMap.get(target).privatePrefix)) {
            debug('set: attempt to access private member');
            if (OptionsMap.get(target).errorOnPrivate === true) {
                throw new Error('Private member access not allowed');
            }
            return undefined;
        }
        return target[name] = value;
    },

    setPrototypeOf: function(target, proto) {
        if (OptionsMap.get(target).setPrototypeOf === true) return false;
        debug('setPrototypeOf: %o, %o', target, prototype);

        return Object.setPrototypeOf(target, proto) !== null;
    }
}

function Privatize(target, options) {
    options = Object.assign({ 
        /** Behavior */
        warn: true, 
        errorOnPrivate: false,
        privatePrefix: '__',
        /** Configuration */
        apply: true,
        construct: true,
        defineProperty: false,
        deleteProperty: false,
        getOwnPropertyDescriptor: true,
        getPrototypeOf: true,
        has: true,
        isExtensible: false,
        ownKeys: true,
        preventExtensions: true,
        setPrototypeOf: false,
    }, options);

    OptionsMap.set(target, options);
    
    if (options.privatePrefix + 'privatize__keyMap' in target === false) {
        if (options.warn) console.warn('Private data might be able to be exposed');
        debug('Private data might be able to be exposed');
    }
    if ('toJSON' in target === false) {
        if (options.warn) console.warn('"toJSON" method needed to allow serialization of getters as properties');
        debug('"toJSON" method needed to allow serialization of getters as properties');
    }

    debug('Privatizing %o with options %o', target, options);

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