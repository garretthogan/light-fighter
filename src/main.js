import './style.css'
import { Game } from './Game.js'

const app = document.querySelector('#app')
const canvas = document.createElement('canvas')
app.appendChild(canvas)

const game = new Game(canvas)
game.init().then(() => game.start())
