const firefox = require('selenium-webdriver/firefox')
const { Builder, By, until } = require('selenium-webdriver')

const PREMIER_LEAGUE_URL = 'https://www.premierleague.com/results'
const MATCH_LIST_IDENTIFIER = '.matchList .matchFixtureContainer'
const COMP_MATCH_ITEM_ID = 'data-comp-match-item'

async function crawler () {
  const options = new firefox.Options().setBinary('/Applications/Firefox.app/Contents/MacOS/firefox-bin')

  const driver = new Builder()
    .forBrowser('firefox').setFirefoxOptions(options).build()

  try {
    await driver.get(PREMIER_LEAGUE_URL)

    const gamesList = await getMatchIds(driver)
    await Promise.all(gamesList.map(async item => console.log(await item.getAttribute(COMP_MATCH_ITEM_ID))))
  } finally {
    driver.quit()
  }
}

async function getMatchIds (driver) {
  return driver.wait(until.elementsLocated(By.css(MATCH_LIST_IDENTIFIER)), 10000)
}

module.exports = crawler
