/*

Usage:

import FirebaseInterface from '../../src/FirebaseInterface.js'

util.toWindow({ ColorMap, Model, util })

class FlockModel extends Model {
  constructor (...args) {
    super(...args)
    this.fbinterface = new FirebaseInterface(this, {scenarioID:'st_somewhere'})

*/

import Evented from './Evented.js'

export default class FirebaseInterface {

  constructor (model, options={scenarioID:'thefirsttest'}) {
    var FBConfig = {
      databaseURL: options.databaseURL || 'https://acequia.firebaseio.com'
    }
    firebase.initializeApp(FBConfig)
    const db = new firebase.database()
    this.minTimeBetweenUpdates = 100
    this._lastUpdate = 0
    this.rootRef = db.ref().child('testofasx').child(options.scenarioID)
    this.model = model
    this.events = []
    this.turtleRef = this.rootRef.child('turtles')
    if(options.scenarioID && options.scenarioID.length > 3 && options.scenarioID.length < 90) {
      this.subscribeToEvents()
      this.watchScenario(options.scenarioID)
    }
  }

  subscribeToEvents () {
    this.model.anim.evented = new Evented()
    this.model.anim.evented.onEvent('start', (arg, ev) => this.updateFB(arg, ev))
    this.model.anim.evented.onEvent('stop', (arg, ev) => this.updateFB(arg, ev))
    this.model.anim.evented.onEvent('step', (arg, ev) => this.updateFB(arg, ev))
    // Below the step function gets overridden. This is no the best way to do it.
    //    ASX intends to implement a way to get step events.
    this.model.anim.___step = this.model.anim.step
    this.model.anim.step = function() { this.___step(); this.evented.fire('step') }
  }

  updateFB (fu, evname) {
    const now = new Date().getTime()
    if (now - this._lastUpdate > this.minTimeBetweenUpdates || evname !== 'step') {
      console.log('updateFB')
      this._lastUpdate = now
      this.turtleRef.set(this.turtlesToGeoJson())
    }
  }

  watchScenario(scenarioID) {
    var db = new firebase.database()
    var ref = db.ref().child('scenarios').child(scenarioID)
    ref.child('models/annotation/airattack').set(this.turtleRef.toString())
    ref.child('models/animating/').on('value', (ev)=>{
      var val = ev.val()
      if(val == false) this.model.anim.stop()
      if(val == true) this.model.anim.start()
    })
    ref.child('models/simspeed/').on('value', (ev)=>{
      var val = Number(ev.val())
      if(val > 1) this.model.speedMultiplier = val
    })
  }

  turtlesToGeoJson () {
    var result = {
      'type': 'FeatureCollection',
      'features': []
    }
    this.model.turtles.forEach((crush) => { // crush is the name of the turtle in Finding Nemo.
      let size = 'small'
      if (crush.size > 1) size = 'medium'
      if (crush.size > 2) size = 'large'
      let color = crush.color.getCss() || '#00ff00'
      // console.log('crush', crush)
      result.features.push({
        'type': 'Feature',
        'geometry': {
          'type': 'Point',
          'coordinates': [crush.x, crush.y]
        },
        'properties': {
          'marker-size': size,
          'marker-color': color,
          'marker-symbol': 'airfield' // should have standard agent script icons
        }
      })
    })
    return result
  }
}
