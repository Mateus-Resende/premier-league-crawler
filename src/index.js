const firefox = require('selenium-webdriver/firefox')
const { Builder, By, until } = require('selenium-webdriver')

const PREMIER_LEAGUE_URL = 'https://www.premierleague.com'

const MATCH_LIST_CLASSES = '.matchList .matchFixtureContainer'
const MATCH_KICKOFF_CLASSES = '.matchDate.renderMatchDateContainer'
const REFEREE_CLASS = '.referee'
const HOME_TEAM_CLASS = '.team.home .teamName .long'
const AWAY_TEAM_CLASS = '.team.away .teamName .long'
const GOALS_CLASS = '.matchScoreContainer .score.fullTime'
const YELLOW_CARDS_HOME_CLASS = '.eventLine .event.home .card-yellow'
const YELLOW_CARDS_AWAY_CLASS = '.eventLine .event.away .card-yellow'

const DATA_COMP_MATCH_ITEM_ID = 'data-comp-match-item'
const DATA_MATCH_KICKOFF = 'data-kickoff'

const RESULTS = []

async function crawler () {
  const options = new firefox.Options().setBinary('/Applications/Firefox.app/Contents/MacOS/firefox-bin')

  const driver = new Builder()
    .forBrowser('firefox').setFirefoxOptions(options).build()

  try {
    await driver.get([PREMIER_LEAGUE_URL, 'results'].join('/'))

    const matchIds = await getMatchIds(driver)

    for (let i = 0; i < matchIds.length; i++) {
      const currentMatch = matchIds[i]
      await driver.get([PREMIER_LEAGUE_URL, 'match', currentMatch].join('/'))
      const result = new Map()
      result.set('kickoff', await getKickoffDate(driver))
      result.set('referee', await getReferee(driver))

      result.set('homeTeam', await getHomeTeam(driver))
      result.set('awayTeam', await getAwayTeam(driver))

      const goals = (await getGoals(driver)).split('-')
      result.set('goalsHomeTeam', goals[0])
      result.set('goalsAwayTeam', goals[1])

      // result.set('yellowCardsHomeTeam', await getYellowCardsHomeTeam(driver))
      // result.set('yellowCardsAwayTeam', await getKickoffDate(driver))

      // result.set('redCardsHomeTeam', await getKickoffDate(driver))
      // result.set('redCardsAwayTeam', await getKickoffDate(driver))
      RESULTS.push(result)
      break
    }
    return RESULTS
  } finally {
    driver.quit()
  }
}

async function getMatchIds (driver) {
  const matches = await getMatchesList(driver)
  return Promise.all(matches.map(async item => item.getAttribute(DATA_COMP_MATCH_ITEM_ID)))
}

function getMatchesList (driver) {
  return driver.wait(until.elementsLocated(By.css(MATCH_LIST_CLASSES)), 10000)
}

async function getKickoffDate (driver) {
  const kickoff = await driver.wait(until.elementLocated(By.css(MATCH_KICKOFF_CLASSES)), 10000)
  return kickoff.getAttribute(DATA_MATCH_KICKOFF)
}

async function getReferee (driver) {
  const refereeObj = await driver.wait(until.elementLocated(By.css(REFEREE_CLASS)), 10000)
  return refereeObj.getText()
}

async function getHomeTeam (driver) {
  const homeTeamObj = await driver.wait(until.elementLocated(By.css(HOME_TEAM_CLASS)), 10000)
  return homeTeamObj.getText()
}

async function getAwayTeam (driver) {
  const homeTeamObj = await driver.wait(until.elementLocated(By.css(AWAY_TEAM_CLASS)), 10000)
  return homeTeamObj.getText()
}

async function getGoals (driver) {
  const homeTeamObj = await driver.wait(until.elementLocated(By.css(GOALS_CLASS)), 10000)
  return homeTeamObj.getText()
}

async function getYellowCardsHomeTeam (driver) {
  const yellowCards = await driver.wait(until.elementsLocated(By.css(YELLOW_CARDS_HOME_CLASS)), 10000)
  return yellowCards.length
}

module.exports = crawler
