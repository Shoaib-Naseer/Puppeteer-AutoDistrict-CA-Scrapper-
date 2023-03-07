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
const otherXpaths = [
  {
    viewSpecificationBtn: `//div[@class='technical-specifications-base expander-base']/div[2]/div/span[text()='View All']`,
  },
  { allLinks: `.year-make a` },
];
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

(async function run(otherXpaths) {
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
    const urls = await getUrls(page, xpaths.allLinks);

    for (let i = 0; i < urls.length; i++) {
      uri = base_uri + urls[i].url;
      //Every Url is now availabe for each page

      //in this array we will store details of one car
      let items = [];

      await page.goto(uri, { waitUntil: 'networkidle2' });
      let item = new_items;

      //Click on Spec to get all the specifications
      const viewSpec = await page.$x(otherXpaths[0].viewSpecificationBtn);
      await viewSpec[0].click();

      //get price from xpath
      try {
        let [price] = await page.$x(xpaths);
        item.Price = await page.evaluate((el) => el.innerText, price);
        item.Price = sanitizeInt(item.Price);
      } catch (error) {}

      // xpaths.forEach((xpath, index) => {
      //   field = Object.keys(xpath).join('');
      //   single_x_path = Object.values(xpath).join('');
      //   item = setData(single_x_path, item, field, numFields);
      //   //saving url into object
      //   item.url = uri;
      //   console.log(`${index + 1} fields done`);
      // });

      items.push(item);
      if (items.length > 0) {
        //add items to csv
        await write(Object.keys(item), item, `cars.csv`);
      }
      console.log(`${i + 1} Product Done`);
    }
  }

  console.log(`website Done`);
  browser.close();
})(otherXpaths);

const getUrls = async (page, link) => {
  let urls = await page.evaluate(() => {
    let results = [];
    //it'll give all the links for cars
    let items = document.querySelectorAll('.year-make a');
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

setData = async (xpath, item, field, numFields) => {
  if (field == 'pictures') {
    //fetch all images src
    try {
      let imgs = await page.$x(xpath);
      let imgSrcs = await Promise.all(
        imgs.map(async (img) => {
          return await page.evaluate((el) => el.src, img);
        })
      );
      if (imgSrcs.length > 0) {
        //move first image to last in index
        imgSrcs.push(imgSrcs.shift());
      }
      imgSrcs = [...new Set(imgSrcs)];
      let imgSrcsString = imgSrcs.join([(separator = ';')]);
      item[field] = imgSrcsString.startsWith('data') ? '' : imgSrcsString;
    } catch (error) {}
  } else {
    try {
      let [element] = await page.$x(xpath);
      item[field] = await page.evaluate((el) => el.innerText, element);
      item[field] = check_if_num(field, numFields)
        ? sanitizeInt(item[field])
        : sanitizeString(item[field]);
    } catch (error) {}
  }
  return item;
};
check_if_num = (field, numFields) => {
  var num_dtype = false;
  for (let i = 0; i < numFields.length; i++) {
    if (field === numFields[i]) {
      num_dtype = true;
      break;
    }
  }
  return num_dtype;
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
