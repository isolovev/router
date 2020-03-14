let loc = location

/**
 * Change event
 * @type {symbol}
 */
let change = Symbol()

/**
 * Changed event
 * @type {symbol}
 */
let routerChanged = Symbol()

/**
 * Navigate event
 * @type {symbol}
 */
let routerNavigate = Symbol()

/**
 * Router routerKey on store
 * @type {symbol}
 */
let routerKey = Symbol('route')

/**
 * Storeon module for URL routing
 * @param {Path[]} routes
 * @return {storeCallback}
 */
function createRouter (routes) {
  routes = routes || []

  return function (store) {
    store.on('@init', () => {
      store.dispatch(change, parse(loc.pathname, routes))
    })

    store.on(routerNavigate, (state, path) => {
      if (state[routerKey].path !== path) {
        history.pushState(null, null, path)
      }

      store.dispatch(change, parse(path, routes))
      store.dispatch(routerChanged, store.get()[routerKey])
    })

    store.on(change, (state, data) => {
      let path = data[0]
      let route = routes[data[1]]
      let params = data[2] || []

      let newState = {}
      newState[routerKey] = {
        match: false,
        path,
        params
      }

      if (data.length > 1) {
        if (typeof route[1] === 'function') {
          newState[routerKey].match = route[1].apply(null, params)
        } else {
          newState[routerKey].match = route[1] || true
        }
      }

      return newState
    })

    document.documentElement.addEventListener('click', event => {
      if (
        !event.defaultPrevented &&
        event.target.tagName === 'A' &&
        event.target.href.indexOf(loc.origin) === 0 &&
        event.target.target !== '_blank' &&
        event.target.dataset.ignoreRouter == null &&
        event.button === 0 &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.shiftKey &&
        !event.altKey
      ) {
        event.preventDefault()
        store.dispatch(
          routerNavigate,
          event.target.href.slice(loc.origin.length)
        )
      }
    })

    window.addEventListener('popstate', () => {
      if (store.get()[routerKey].path !== loc.pathname) {
        store.dispatch(change, parse(loc.pathname, routes))
        store.dispatch(routerChanged, store.get()[routerKey])
      }
    })
  }
}

/**
 * @private
 * @param {string} path
 * @param {Path[]} routes
 * @return {array}
 */
function parse (path, routes) {
  let normalized = path.replace(/(^\/|\/$)/g, '')

  for (let [index, item] of routes.entries()) {
    if (typeof item[0] === 'string') {
      let checkPath = item[0].replace(/(^\/|\/$)/g, '')

      if (checkPath === normalized) {
        return [path, index]
      }

      if (checkPath.includes('*')) {
        let prepareRe = checkPath
          .replace(/[\s!#$()+,.:<=?[\\\]^{|}]/g, '\\$&')
          .replace(/\*/g, '([^/]*)')
        let re = RegExp('^' + prepareRe + '$', 'i')
        let match = normalized.match(re)

        if (match) {
          return [path, index, [].concat(match).slice(1)]
        }
      }
    }

    if (item[0] instanceof RegExp) {
      let matchRE = normalized.match(item[0])
      if (matchRE) {
        return [path, index, [].concat(matchRE).slice(1)]
      }
    }
  }

  return [path]
}

module.exports = {
  routerNavigate,
  routerChanged,
  routerKey,
  createRouter
}

/**
 * @typedef {array} Path
 * @property {string | RegExp} 0
 * @property {?function} 1
 */

/**
 * @private
 * @callback storeCallback
 * @param {Store} store
 */

/**
 * @private
 * @name Store
 * @class
 * @method get
 * @method dispatch
 * @method on
 */
