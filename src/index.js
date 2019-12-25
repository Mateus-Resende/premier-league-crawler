const firefox = require('selenium-webdriver/firefox')
const { Builder, By, until } = require('selenium-webdriver')
const fs = require('fs')

const PREMIER_LEAGUE_URL = 'https://www.premierleague.com'
const ATTRIBUTES = [
  'id',
  'kickoff',
  'referee',
  'homeTeam',
  'awayTeam',
  'goalsHomeTeam',
  'goalsAwayTeam',
  'yellowCardsHomeTeam',
  'yellowCardsAwayTeam',
  'redCardsHomeTeam',
  'redCardsAwayTeam'
]

const MATCH_LIST_CLASSES = '.matchList .matchFixtureContainer'
const MATCH_KICKOFF_CLASSES = '.matchDate.renderMatchDateContainer'
const REFEREE_CLASS = '.referee'
const HOME_TEAM_CLASS = '.team.home .teamName .long'
const AWAY_TEAM_CLASS = '.team.away .teamName .long'
const GOALS_CLASS = '.matchScoreContainer .score.fullTime'
const YELLOW_CARDS_HOME_CLASS = '.timeLine.timeLineContainer .eventLine .event.home span.card-yellow'
const YELLOW_CARDS_AWAY_CLASS = '.timeLine.timeLineContainer .eventLine .event.away span.card-yellow'
const RED_CARDS_HOME_CLASS = '.timeLine.timeLineContainer .eventLine .event.home span.card-red'
const RED_CARDS_AWAY_CLASS = '.timeLine.timeLineContainer .eventLine .event.away span.card-red'

const DATA_COMP_MATCH_ITEM_ID = 'data-comp-match-item'
const DATA_MATCH_KICKOFF = 'data-kickoff'

const options = new firefox.Options().setBinary('/Applications/Firefox.app/Contents/MacOS/firefox-bin')
const results = []
let driver = new Builder()
  .forBrowser('firefox').setFirefoxOptions(options)

module.exports = class Crawler {
  constructor () {
    driver = driver.build()
  }

  async run () {
    try {
      await driver.get([PREMIER_LEAGUE_URL, 'results'].join('/'))
      const matchIds = await getMatchIds()

      for (let i = 0; i < matchIds.length; i++) {
        try {
          const currentMatch = matchIds[i]
          const result = await extractMatchData(currentMatch)
          results.push(result)
          break
        } catch (err) {
          console.error(`Match with id ${matchIds[i]} could not be retrieved`)
          const result = new Map()
          result.set('id', matchIds[i])
          results.push(result)
        }
      }
      return saveToCSV()
    } catch (err) {
      console.error(err)
      saveToCSV('partial.csv')
    } finally {
      driver.quit()
    }
  }
}

async function extractMatchData (currentMatch) {
  await driver.get([PREMIER_LEAGUE_URL, 'match', currentMatch].join('/'))
  const result = new Map()

  result.set('id', currentMatch)
  result.set('kickoff', await getKickoffDate())
  result.set('referee', await getReferee())

  result.set('homeTeam', await getHomeTeam())
  result.set('awayTeam', await getAwayTeam())

  const goals = (await getGoals()).split('-')
  result.set('goalsHomeTeam', goals[0])
  result.set('goalsAwayTeam', goals[1])

  result.set('yellowCardsHomeTeam', await getYellowCardsHomeTeam())
  result.set('yellowCardsAwayTeam', await getYellowCardsAwayTeam())

  result.set('redCardsHomeTeam', await getRedCardsHomeTeam())
  result.set('redCardsAwayTeam', await getRedCardsAwayTeam())

  return result
}

async function getMatchIds () {
  const matches = await getMatchesList()
  return Promise.all(matches.map(async item => item.getAttribute(DATA_COMP_MATCH_ITEM_ID)))
}

async function getMatchesList () {
  let matches = []
  let newMatches = []

  while (matches.length === 0 || matches.length !== newMatches.length) {
    matches = await driver.wait(until.elementsLocated(By.css(MATCH_LIST_CLASSES)), 10000)
    await scrollUntilTheEnd()
    newMatches = await driver.wait(until.elementsLocated(By.css(MATCH_LIST_CLASSES)), 10000)
  }

  return newMatches
}

async function scrollUntilTheEnd () {
  await driver.executeScript('window.scrollTo(0, document.body.scrollHeight)')
  await driver.sleep(3000)
}

async function getKickoffDate () {
  const kickoffObj = await driver.wait(until.elementLocated(By.css(MATCH_KICKOFF_CLASSES)), 10000)
  const kickoff = await kickoffObj.getAttribute(DATA_MATCH_KICKOFF)
  return (new Date(Number.parseInt(kickoff))).toISOString().slice(0, 10)
}

async function getReferee () {
  const refereeObj = await driver.wait(until.elementLocated(By.css(REFEREE_CLASS)), 10000)
  return refereeObj.getText()
}

async function getHomeTeam () {
  const homeTeamObj = await driver.wait(until.elementLocated(By.css(HOME_TEAM_CLASS)), 10000)
  return homeTeamObj.getText()
}

async function getAwayTeam () {
  const homeTeamObj = await driver.wait(until.elementLocated(By.css(AWAY_TEAM_CLASS)), 10000)
  return homeTeamObj.getText()
}

async function getGoals () {
  const homeTeamObj = await driver.wait(until.elementLocated(By.css(GOALS_CLASS)), 10000)
  return homeTeamObj.getText()
}

async function getYellowCardsHomeTeam () {
  let yellowCards
  try {
    yellowCards = await driver.wait(until.elementsLocated(By.css(YELLOW_CARDS_HOME_CLASS)), 5000)
  } catch (err) {
    yellowCards = []
    console.error('No yellow cards were given to the home team')
  }
  return yellowCards.length
}

async function getYellowCardsAwayTeam () {
  let yellowCards
  try {
    yellowCards = await driver.wait(until.elementsLocated(By.css(YELLOW_CARDS_AWAY_CLASS)), 5000)
  } catch (err) {
    yellowCards = []
    console.error('No yellow cards were given to the away team')
  }
  return yellowCards.length
}

async function getRedCardsHomeTeam () {
  let redCards
  try {
    redCards = await driver.wait(until.elementsLocated(By.css(RED_CARDS_HOME_CLASS)), 5000)
  } catch (err) {
    redCards = []
    console.error('No red cards were given to the home team')
  }
  return redCards.length
}

async function getRedCardsAwayTeam () {
  let redCards
  try {
    redCards = await driver.wait(until.elementsLocated(By.css(RED_CARDS_AWAY_CLASS)), 5000)
  } catch (err) {
    redCards = []
    console.error('No red cards were given to the away team')
  }
  return redCards.length
}

function saveToCSV (filename = 'consolidated.csv') {
  try {
    fs.writeFileSync(filename, prepareData())
  } catch (err) {
    console.error(err)
  }
}

function prepareData () {
  const parsedResults = results.map(result => ATTRIBUTES.map(attr => result.get(attr)).join(','))
  parsedResults.unshift(ATTRIBUTES.join(','))
  return parsedResults.join('\n')
}
