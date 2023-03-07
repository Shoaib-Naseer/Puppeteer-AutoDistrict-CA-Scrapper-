const puppeteer = require('puppeteer');
const new_items = require('./items');
const fs = require('fs');
const path = require('path');
const { get } = require('http');
var json2csv = require('json2csv').parse;

const numFields = [
  'Year',
  'Kilometers',
  'Price',
  'CityFuelEconomy',
  'HwyFuelEconomy',
];
const otherXpaths = {
  viewSpecificationBtn: `//div[@class='technical-specifications-base expander-base']/div[2]/div/span[text()='View All']`,

  allLinks: `.year-make a`,
};
const xpaths = {
  Price: `//div[contains(text(),"$")and@class='detail alt']`,
  Year: `//span[@class='year']`,
  MakeModel1: `//span[@class='make']`,
  MakeModel2: `//span[@class='model']`,

  Kilometers: `//div[contains(text(),"Mileage")]/..//div[@class='detail']`,

  Transmission: `//div[contains(text(),'Trans Description Cont.')]/following-sibling::div`,

  Engine: `((//strong[contains(text(),'Mechanical')])[1]/parent::div/following-sibling::div/span)[1]`,

  EngineSize: `//div[contains(text(),"Displacement")]/following-sibling::div`,

  Trim: `//span[@class='submodel']`,
  BodyStyle: `//div[text()='Body Style']/following-sibling::div`,
  SellerComments: `//div[text()='Description']/following-sibling::p`,
  CityFuelEconomy: `//div[contains(text(),'City')]/following-sibling::div`,
  HwyFuelEconomy: `//div[contains(text(),'Hwy')]/following-sibling::div`,

  DriveType: `//div[contains(text(),'Drivetrain')]/following-sibling::div`,

  ExteriorColor: `//div[contains(text(),'Exterior Colour')]/parent::div/following-sibling::div`,
  // {
  //   InteriorColor: `//td[contains(text(),'Interior color')]/../td[@class='info-value']`,
  // },
  // { Doors: `//td[contains(text(),'Doors')]/../td[@class='info-value']` },

  StockNumber: `//div[contains(text(),'Stock')]/parent::div/following-sibling::div`,
  FuelType: `//span[(@class='title')and(contains(text(),'Fuel'))]`,
  // { Vin: `//td[contains(text(),'VIN')]/../td[@class='info-value']` },
  pictures: `(//div[@class='slick-track'])[1]/a`,
};

//url
const url = 'https://www.autodistrict.ca/inventory/?page=';

(async function run() {
  const base_uri = `https://www.autodistrict.ca`;
  //custom path for storing the cookies
  const browser = await puppeteer.launch({
    headless: false,
  });
  const page = await browser.newPage();

  //Go to each page of listing (although there are only two listing page available)
  for (let i = 1; i <= 2; i++) {
    console.log(`${url}${i}`);
    await page.goto(`${url}${i}`, { waitUntil: 'networkidle2' });
    await page.waitForXPath(`//nav[@class='pagination-base ']`);

    //get all the urls of product from 1 page
    const link = otherXpaths.allLinks;
    const urls = await getUrls(page);

    for (let i = 0; i < urls.length; i++) {
      const uri = base_uri + urls[i].url;
      console.log(uri);
      //Every Url is now availabe for each page

      //in this array we will store details of one car
      let items = [];

      await page.goto(uri, { waitUntil: 'networkidle2' });
      let item = new_items;

      //Click on Spec to get all the specifications
      try {
        const [viewSpec] = await page.$x(otherXpaths.viewSpecificationBtn);
        await viewSpec.click();
      } catch (error) {}

      item.url = uri;
      //get price from xpath
      try {
        let [data] = await page.$x(xpaths.Price);
        new_data = await page.evaluate((el) => el.innerText, data);
        item.Price = sanitizeInt(new_data);
      } catch (error) {}

      //get Year from xpath
      try {
        let [data] = await page.$x(xpaths.Year);
        data = await page.evaluate((el) => el.innerText, data);
        item.Year = sanitizeInt(data);
      } catch (error) {}

      //get MakeModel1 from xpath
      try {
        let [data] = await page.$x(xpaths.MakeModel1);
        data = await page.evaluate((el) => el.innerText, data);
        item.MakeModel1 = sanitizeString(data);
      } catch (error) {}

      //get MakeModel1 from xpath
      try {
        let [data] = await page.$x(xpaths.MakeModel2);
        data = await page.evaluate((el) => el.innerText, data);
        item.MakeModel2 = sanitizeString(data);
      } catch (error) {}

      //get Kilometers from xpath
      try {
        let [data] = await page.$x(xpaths.Kilometers);
        data = await page.evaluate((el) => el.innerText, data);
        item.Kilometers = sanitizeInt(data);
      } catch (error) {}

      //get Transmission from xpath
      try {
        let [data] = await page.$x(xpaths.Transmission);
        data = await page.evaluate((el) => el.innerText, data);
        item.Transmission = sanitizeString(data);
      } catch (error) {}

      //get Engine from xpath
      try {
        let [data] = await page.$x(xpaths.Engine);
        data = await page.evaluate((el) => el.innerText, data);
        item.Engine = sanitizeString(data);
      } catch (error) {}

      //get Engine Size from xpath
      try {
        let [data] = await page.$x(xpaths.EngineSize);
        data = await page.evaluate((el) => el.innerText, data);
        item.EngineSize = sanitizeString(data);
      } catch (error) {}

      //get Trim from xpath
      try {
        let [data] = await page.$x(xpaths.Trim);
        data = await page.evaluate((el) => el.innerText, data);
        item.Trim = sanitizeString(data);
      } catch (error) {}

      //get BodyStyle from xpath
      try {
        let [data] = await page.$x(xpaths.BodyStyle);
        data = await page.evaluate((el) => el.innerText, data);
        item.BodyStyle = sanitizeString(data);
      } catch (error) {}

      //get Seller Comments from xpath
      try {
        let [data] = await page.$x(xpaths.SellerComments);
        data = await page.evaluate((el) => el.innerText, data);
        item.SellerComments = sanitizeString(data);
      } catch (error) {}

      //get Exterior Color from xpath
      try {
        let [data] = await page.$x(xpaths.ExteriorColor);
        data = await page.evaluate((el) => el.innerText, data);
        item.ExteriorColor = sanitizeString(data);
      } catch (error) {}

      //get Stock from xpath
      try {
        let [data] = await page.$x(xpaths.StockNumber);
        data = await page.evaluate((el) => el.innerText, data);
        item.StockNumber = sanitizeInt(data);
      } catch (error) {}

      //get FuelType from xpath
      try {
        let [data] = await page.$x(xpaths.FuelType);
        data = await page.evaluate((el) => el.innerText, data);
        item.FuelType = sanitizeString(data);
      } catch (error) {}

      //get City fuel economy from xpath
      try {
        let [data] = await page.$x(xpaths.CityFuelEconomy);
        data = await page.evaluate((el) => el.innerText, data);
        item.CityFuelEconomy = sanitizeInt(data);
      } catch (error) {}
      //get City fuel economy from xpath
      try {
        let [data] = await page.$x(xpaths.HwyFuelEconomy);
        data = await page.evaluate((el) => el.innerText, data);
        item.HwyFuelEconomy = sanitizeInt(data);
      } catch (error) {}

      //get City fuel economy from xpath
      try {
        let [data] = await page.$x(xpaths.DriveType);
        data = await page.evaluate((el) => el.innerText, data);
        item.DriveType = sanitizeString(data);
      } catch (error) {}
      //fetch all images src
      try {
        let imgs = await page.$x(xpaths.pictures);
        let imgSrcs = await Promise.all(
          imgs.map(async (img) => {
            return await page.evaluate((el) => el.href, img);
          })
        );
        if (imgSrcs.length > 0) {
          //move first image to last in index
          imgSrcs.push(imgSrcs.shift());
        }
        imgSrcs = [...new Set(imgSrcs)];
        let imgSrcsString = imgSrcs.join([(separator = ';')]);
        console.log(imgSrcs);
        item.pictures = imgSrcsString.startsWith('data') ? '' : imgSrcsString;
      } catch (error) {}

      items.push(item);
      if (items.length > 0) {
        //add items to csv
        await write(Object.keys(items), items, `cars.csv`);
      }
      console.log(`${i + 1} Product Done`);
    }
  }

  console.log(`website Done`);
  browser.close();
})();

const getUrls = async (page) => {
  let urls = await page.evaluate(() => {
    let results = [];
    //it'll give all the links for cars
    let items = document.querySelectorAll(`.year-make a`);
    //to get the href from a tags
    items.forEach((item) => {
      results.push({
        url: item.getAttribute('href'),
        text: item.innerText,
      });
    });
    return results;
  });
  console.log(urls.length);
  return urls;
};

function sanitizeString(str) {
  //remove \t and \n
  str = str.replace(/(\r\n|\n|\r|\t)/gm, '');
  //remove multiple spaces
  str = str.replace(/\s+/g, ' ');
  //remove leading and trailing spaces
  str = str.trim();
  return str;
}

function sanitizeInt(num) {
  num = num.replace(/[^0-9]/g, '');
  return num;
}

async function write(headersArray, dataJsonArray, fname) {
  const filename = path.join(__dirname, `${fname}`);
  let rows;
  // If file doesn't exist, we will create new file and add rows with headers.
  if (!fs.existsSync(filename)) {
    rows = json2csv(dataJsonArray, { header: true });
  } else {
    // Rows without headers.
    rows = json2csv(dataJsonArray, { header: false });
  }

  // Append file function can create new file too.
  fs.appendFileSync(filename, rows);
  // Always add new line if file already exists.
  fs.appendFileSync(filename, '\r\n');
}
