import puppeteer from 'puppeteer-extra';
import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip'
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { glob } from 'glob';
import logger from '././logger.js';
import RecaptchaPlugin from 'puppeteer-extra-plugin-recaptcha';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';


const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename);
const imageDownload = path.resolve(__dirname, 'media')
puppeteer.use(RecaptchaPlugin()).use(StealthPlugin())
dotenv.config({path: path.resolve(__dirname, '..') + "/.env"})


export async function p_homestyler(image_id, name) {
  // Launch the browser and open a new blank page

  const browser = await puppeteer.launch({
    //executablePath: "/usr/bin/google-chrome",
    headless: false, // Parament  "new" or false
    defaultViewport: null,
    args: [
      "--window-size=1920x1200",
      "--disable-dev-shm-usage",
      '--disable-setuid-sandbox',
      "--no-sandbox",
    ],
  });
  const page = await browser.newPage();
  // Setting the object loading path
  const client = await page.target().createCDPSession();
  await client.send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: imageDownload
  });
  const user_agent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
  await page.setUserAgent(user_agent)
  await page.goto(process.env.URL, {waitUntil: 'domcontentloaded'}); // option that will wait, when DOM will be loaded
  // BLOCK AUTH
  try {
    await authentication(page)
    logger.info("Authorization success")
  } catch (err) {
      logger.error(err.message, "Failed authentication")
      await browser.close()
      return [400, "Ошибка при аутентификации."]
  }

  // BLOCK MANAGER PROJECT
  try {
    await project_selector(page)
    logger.info("Project select")
  } catch (err) {
    logger.error(err.message, "Failed select project")
      await browser.close()
      return [400, "Ошибка при выборе проекта."]
  }


  // BLOCK 3D EDITOR
  try {
    const error = await editor3D(page, image_id, name)
    if (error[0] === 400) {
      await browser.close()
      logger.error(error[1])
      return error
    }
  } catch (err) {
    logger.error(err.message, 'Error when working in 3D editor')
    await browser.close()
    return [400, "Ошибка при работе в 3D редакторе."]
  }


  // BLOCK RENDER
  try {
    await rendering(page)
  } catch (err) {
    logger.error(err.message, 'Error when image rendering')
    await browser.close()
    return [400, "Ошибка при рендеринге изображения."]
  }


  // BLOCK GALLERY
  try {
    await upload_image(page)
    // closing browser windows
    await browser.close()
  } catch (err) {
    logger.error(err.message, 'Error when loading the image')
    await browser.close()
    return [400, "Ошибка при загрузке изображения."]
  }


  // UNPACK AND SAVE IMAGE
  try {
    return await generating_image()
  } catch (err) {
    logger.error(err.message, "Error when generating image")
    await browser.close()
    return [400, "Ошибка при генерировании изображения."]
  }
}


async function authentication(page) {
  // Switch to frame
  const frame = await page.waitForFrame(
    frame => frame.name() == "global-iframe-popup", {timeout:60000}
  )
  // Switch to sign
  await frame.waitForSelector(".sign-in-btn", {visible: true}).then(
    (frame) => frame.evaluate(auth => auth.click(".sign-in-btn"))
  )
  // Types email and password
  await frame.type('#drgSignInEmail', process.env.LOGIN, {delay: 300})
  await frame.type('#drgSignInPassword', process.env.PASSWORD, {delay: 350})
  // Click to login 
  await frame.click("#drgSignInSubmit")
}


async function project_selector(page) {
  // Skip
  const skip_selector = "#welcome-frame-container > div.walkthrough-container > div > div.walkthrough-close-area > div"
  await page.waitForSelector(skip_selector, {timeout: 120000}
    ).then((skip) => skip.evaluate(image_button => image_button.click()))
  logger.info("Skip 1")
  // Project select
  const project_selector = "#welcomeframe > div.welcome-rightpanel > div.welcome-right-bottom > div > div.open-designs-contents > div:nth-child(1) > img"
  await page.waitForSelector(project_selector, {timeout: 60000}).then(
    (select_project) => select_project.evaluate(select => select.click())
  )
}


async function editor3D(page, num, name) {
  // Select plane 2D
  const plane_xpath = "/html/body/div[3]/div[55]/div/div[1]/div[3]/div/ul/li[1]/ul/li[1]/div[2]"
  await page.waitForXPath(plane_xpath, {timeout: 60000}).then(
    (plane_2D) => plane_2D.evaluate(plane => plane.click())
  )
  logger.info("Select plane 2D")
  
  try {
    await page.waitForSelector(`#image${num}`, {timeout: 60000}).then(
      (image) => image.click()
    )
    logger.info("Object select")
  } catch (err) {
    logger.error(err.message)
    return [400, 'Передано неверное название объекта']
  }
  // Enter replace
  await page.waitForSelector(".hs-left-item:nth-child(1)", {timeout: 15000}).then(
    () => page.click('.hs-left-item:nth-child(1)')
  )
  logger.info("Enter replace")
  // Field search
  const field_search_xpath = "/html/body/div[3]/div[2]/div[1]/div[1]/div/div[2]/div[1]/div[2]/div/div[1]/div/div[2]/div[1]/span"
  let search = await page.waitForXPath(field_search_xpath, {timeout: 60000}).then(
    () => page.$x(field_search_xpath)
  )
  await search[0].click()
  logger.info("Field search")
  // Past new object
  const past_xpath = "/html/body/div[3]/div[2]/div[1]/div[1]/div/div[2]/div[1]/div[2]/div/div[1]/div/div/div/span/span/input"
  let new_obj = await page.waitForXPath(past_xpath, {timeout: 60000}).then(
    () => page.$x(past_xpath)
  )
  await new_obj[0].type(name, {delay: 250})
  logger.info("Type search")
  // Search new object
  const enter_xpath = "#plugin-container > div.catalogIndependentContainer > div.homestyler-ui-components.draggable-modal-container.hsc-catalog-independent-draggable.react-draggable > div.zoom-box > div > div.scrollbar-container.homestyler-ui-components.homestyler-scroll.zoom-body.ps > div.hsc-independent-page-container > div.product-page-content > div > div.independent-header-container > div > div > div > span > span > input"
  let search_new_obj_click = await page.waitForSelector(enter_xpath, {timeout: 60000})
  await page.waitForTimeout(250)
  await search_new_obj_click.press('Enter')
  await page.waitForTimeout(250)
  await search_new_obj_click.press('Enter')
  logger.info("Searching new object")
  // Selecting and replacing old object on new
  try {
    const replace_object = "#plugin-container > div.catalogIndependentContainer > div.homestyler-ui-components.draggable-modal-container.hsc-catalog-independent-draggable.react-draggable > div.zoom-box > div > div.scrollbar-container.homestyler-ui-components.homestyler-scroll.zoom-body.ps > div.hsc-independent-page-container > div.product-page-content > div > div.hsc-model-container > div.hsc-infinite-loader > div > div.product-list-content > div.product-list > div:nth-child(1) > div > img"
    await page.waitForSelector(replace_object, {timeout: 20000}).then(
      (replace) => replace.click()
    )
  } catch (err) {
    logger.error(err.message)
    return [400, 'Передано неправильное название объекта']
  }
  logger.info('Selecting and replaced old object on new')
  try {
    const confirmin_replace = "body > div.homestyler-ui-components.homestyler-modal-container > div > div > div > div > div.homestyler-modal-bottom-container > button"
    await page.waitForSelector(confirmin_replace, {timeout: 1000}).then(
        () => page.click(confirmin_replace)
      )
      logger.info("Confirming replace")
  } catch {
    logger.info("Without replacing confirmation")
    return [200, 'Без подтверждения замены']
  }
}


async function rendering(page) {
  // Editor entry
  await page.waitForTimeout(3000)
  const editor_xpath = "/html/body/div[3]/div[30]/div[1]/div/div/ul/li[12]/div/div[2]"
  let editor = await page.waitForXPath(editor_xpath, {timeout: 60000}).then(
    () => page.$x(editor_xpath)
  )
  await editor[0].click()
  logger.info("Editor entry")
  // Close popup
  try {
  await page.waitForSelector(".advice-ad-modal span", {timeout: 60000}).then(
    () => page.click(".advice-ad-modal span")
  )
    logger.info('Close popup')
  } catch {
    logger.info('Pass close popup')
  }
  // Distance setting
  const fov_xpath = "/html/body/div[3]/div[47]/section/section/div[4]/div[2]/div[2]/div[3]/div[2]/div[1]/div[1]/div[2]/div/span/input"
  let fov = await page.waitForXPath(fov_xpath, {timeout: 60000}).then(
    () => page.$x(fov_xpath)
  )
  await fov[0].click({count: 3})
  await fov[0].type('90')
  await fov[0].press('Enter')
  logger.info('Distance setting')
  // Lauch render
 const render_xpath = '//*[@id="render_tab"]/section/section/section/main/div[1]/div/button/span'
  await page.waitForXPath(render_xpath, {timeout: 60000}).then(
    (render) => render.evaluate(r => r.click())
  )
  // await render[0].click()
  logger.info('Launch render')
  // Gallery entry
  try {
    await page.waitForSelector("div.btn-item:first-child", {timeout: 30000}).then(
      (gallery) => gallery.evaluate(image_button => image_button.click()))
      logger.info('Gallery entry')
  } catch (err) {
    logger.warn(err.message, 'Passed gallery entry v1')
    await page.waitForSelector('#showResultDashboard', {timeout: 15000}).then(
      () => page.click('#showResultDashboard')
    )
    logger.info('Gallery entry v2')
  }
}


async function upload_image(page) {
  // Downloading render image
  const move_cursor_xpath = "/html/body/div[3]/div[49]/div/section/main/div[2]/div[1]/div/div[1]/div[1]/div[2]/div/div/div[2]/div/div/div"
  await page.waitForXPath(move_cursor_xpath, {timeout: 120000}).then(
      () => page.evaluate(() => document.querySelector("#renderImageBrowser > div > section > main > div.scrollbar-container.ps.ps--theme_default > div:nth-child(1) > div > div > div.ribpGridViewerCard16to9.ribpGridViewerCardSign > div.grid-viewer-card-footer > div > div > div:nth-child(2) > div > div > div").click()));
  logger.info('Move to element')

  const obj = "/html/body/div[3]/div[49]/div/section/main/div[2]/div[1]/div/div/div[2]/label/span/input"
  await page.waitForXPath(obj, {timeout: 30000}).then(
    () => page.evaluate(() => document.querySelector("#renderImageBrowser > div > section > main > div.scrollbar-container.ps.ps--theme_default > div:nth-child(1) > div > div > div.select-checkbox > label > span > input").click()))
  logger.info('Click to element')

  const download =  "/html/body/div[3]/div[49]/div/section/main/div[1]/div[2]/div/div[2]/div/span"
  await page.waitForXPath(download, {timeout: 30000, visible: true}).then(
    () => page.evaluate(() => document.querySelector("#renderImageBrowser > div > section > main > div.ant-row.ribpGridViewerInfo > div.ant-col.info-right.ant-col-xs-18 > div > div:nth-child(3) > div > span").click()))
  
  await page.waitForResponse(response => response.url().endsWith('.zip'), { timeout: 60000 }) // Increased timeout to 60 seconds
  logger.info('Downloading')
  await page.waitForTimeout(3000)
}


async function generating_image() {
  const archive = (await glob(imageDownload + "/*.zip"))[0]
  const unzip = new AdmZip(archive)
  unzip.extractAllTo(imageDownload, true)
  fs.unlink(archive, () => {})
  logger.info('Unpack and save image')
  const image = (await glob(imageDownload + "/*.jpg"))[0]
  return [200, "Изображение успешно сгенерировано", image]
}
