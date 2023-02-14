const Crawler = require('simplecrawler')
const cheerio = require('cheerio')
const axios = require('axios')
const { validationResult } = require('express-validator')

module.exports = {
	crawler: (req, res) => {
		const { url } = req.body
		let crawler = new Crawler(url)
		crawler.interval = 5000 // Ten seconds
		crawler.maxConcurrency = 3
		crawler.maxDepth = 1
		// crawler.on("fetchcomplete", function(queueItem, responseBuffer, response) {
		//     console.log("I just received %s (%d bytes)", queueItem.url, responseBuffer.length);
		//     console.log("Response \n", response);
		//     console.log("QueueItem", queueItem);
		// });
		crawler.on('fetchcomplete', function (queueItem, responseBuffer) {
			let html = responseBuffer.toString()

			const $ = cheerio.load(html)
			console.log($.body)

			// console.log($(this).getAttribute('span').toString())
			// let elements = $(this).getElementsByClassName('div');
			// for (let i = 0; i < elements.length; i++) {
			//     console.log(elements[i].innerHTML);
			// }
			// $('div.price').each(function (i, element) {
			// $('div.price').each(function (i, element) {
			//     console.log('2')
			//     console.log($(this).attrs('price').text)
			// })
		})

		crawler.downloadUnsupported = false
		crawler.decodeResponses = true

		crawler.addFetchCondition(function (queueItem) {
			return !queueItem.path.match(/\.(zip|jpe?g|png|mp4|gif)$/i)
		})

		crawler.on('crawlstart', function () {
			console.log('crawlstart')
		})

		crawler.on('fetch404', function (queueItem, response) {
			console.log('fetch404', queueItem.url, response.statusCode)
		})

		crawler.on('fetcherror', function (queueItem, response) {
			console.log('fetcherror', queueItem.url, response.statusCode)
		})

		crawler.on('complete', function () {
			console.log('complete')
		})
		crawler.start()

		return res.status(200).json({ msg: url })
	},
	crawlerWithCheerio: async (req, res) => {
		const { url } = req.body
		const pageHTML = await axios.get(url, {
			headers: {
				'Accept-Encoding': 'gzip, deflate, br'
			}
			//is the same as set the entire url
		})
		const htmlData = cheerio.load(pageHTML.data)

		const link = new URL(url).host
		let data = {
			name: null,
			price: null,
			image: null,
			url: url,
			currency: null
		}
		console.log('link: ', link)
		switch (link) {
			case 'www.ahlens.se':
				data.name = htmlData(
					'[data-testid="ProductDetailsBlockTestIds_name"]'
				).text()
				data.image = htmlData('.jss167 span > img').attr('src')
				data.price = htmlData(
					'[data-testid="ProductDetailsBlockTestIds_price"]'
				).text()
				break
			case 'www.magasin.dk':
				data.name = htmlData('.js-productName').text()
				data.price = htmlData('.js-productPrice > .price > span > span > span ')
					.text()
					.replace(/^\n|\n$/g, '')
				data.image = htmlData('.productDetailsImage__image').attr('src')
				break
			case 'www.amazon.com':
				data.name = htmlData('#productTitle').text().trim()
				const price_one = htmlData('.apexPriceToPay > span')
					.first()
					.text()
					.toString()
					.trim()
				const price_two = htmlData('.priceToPay > span').first().text().trim()
				data.price = price_one ? price_one : price_two
				data.image = htmlData('.imgTagWrapper > img').attr('src')
				break
			case 'www.elgiganten.dk':
				data.name = htmlData('.product-title').text()
				data.price = htmlData('.price__value > span')
					.first()
					.text()
					.replace('.-', '')
				let pd_image = htmlData('.swiper-slide > img').attr('src')
				data.image = pd_image ? pd_image : null
				break
			case 'www.georgjensen.com':
				data.name = htmlData('.product-detail > div > h1')
					.text()
					.toString()
					.trim()
				data.price = htmlData('.product-price > span')
					.first()
					.text()
					.replace('DKK', '')
					.replace(/^\n|\n$/g, '')
				let p_image = htmlData(
					'.product-image-carousel > a > picture > img'
				).attr('src')
				data.image = p_image ? 'https://www.georgjensen.com' + p_image : null
				break
			case 'www.sinnerup.dk':
				data.name = htmlData('.item-name  > h1').text().toString().trim()
				data.price = htmlData('.item-prices__value').text().replace('kr.', '')
				let ps_image = htmlData('.item-image > a')
					.attr('data-srcset')
					.split(',')[2]
					.trim()
					.replace('760w', '')
				data.image = ps_image ? ps_image : null
				data.currency = 'Kr'
				break
			case 'www.imerco.dk':
				data.name = htmlData('.ezs9ur40 > span').text().toString().trim()
				let im_prc_1 = htmlData('.css-1hti6gr').text().toString().trim()
				let im_prc_2 = htmlData('.css-mc3fz4').text().toString().trim()
				data.price = im_prc_1 ? im_prc_1 : im_prc_2
				let temp_image = htmlData('.css-bjn8wh > div > div > img')
					.attr('src')
					.split('https://integration.imerco.dk/api')
					.pop()
					.trim()
				data.image = 'https://integration.imerco.dk/api' + temp_image
				break

			case 'www.ikea.com':
				data.name = htmlData('span.pip-header-section__title--big.notranslate')
					.text()
					.toString()
					.trim()
				data.price = htmlData('span.pip-temp-price__integer')
					.text()
					.toString()
					.trim()
					.replace(':-', '')
				data.image = htmlData('span.pip-media-grid__media-image > img')
					.attr('src')
					.trim()
				data.currency = null
				break
			case 'www2.hm.com':
				data.name = htmlData('#js-product-name div h1').text().toString().trim()
				data.price = htmlData('span.price-value')
					.text()
					.toString()
					.trim()
					.match(/\d/g, '')
					.join('')
				data.image =
					'https:' +
					htmlData('.product-detail-main-image-container > img')
						.attr('src')
						.trim()
				data.currency = 'EUR'
				break
			case 'salling.dk':
				data.name = htmlData('.product-page__title').text().toString().trim()
				data.price = htmlData('.price__current-price').text().toString().trim()
				let img_sal = htmlData('.product-page__slider > div > img').attr('src')
				data.image = img_sal ? img_sal : null
				data.currency = 'kr'
				break
			case 'www.kitchenone.dk':
				data.name = htmlData("*[itemprop = 'name']").text().toString().trim()
				data.price = htmlData("*[itemprop = 'price']").text().toString().trim()
				let img_kit = htmlData('.basicData > div > div > div > img').attr(
					'data-src'
				)
				data.image = img_kit ? img_kit : null
				console.log(img_kit)
				data.currency = 'kr'
				break
			case 'www.weber.com':
				data.name = htmlData('.product-name').text().toString().trim()
				data.price = htmlData('.price').first().text().toString().trim()
				let img_weber = htmlData('.slick-slide').html()
				data.image = img_weber ? img_weber : null
				console.log(img_weber)
				data.currency = 'kr'
				break
			case 'www.dunelm.com':
				data.name = htmlData('[data-testid="product-title"]').text()
				data.price = htmlData('[data-testid="product-price"]').text()
				data.image = htmlData('[data-testid="mainImage"]').attr('src')
				data.currency = 'eur'
				break
			case 'www.johnlewis.com':
				data.name = htmlData('[data-cy="product-header-block"]')
					.find('h1')
					.text()

				console.log('name: ', data.name)
				data.price = htmlData('[data-cy="product-price-title"]')
					.find('span')
					.text()
				data.image = htmlData('.slick-slide > div > div > img').attr('src')
				data.currency = 'eur'
				break
			case 'www.wayfair.com':
				data.name = htmlData('[data-hb-id="Heading"]').text()
				data.price = htmlData('[data-enzyme-id="PriceBlock"]')
					.find('div > div > span')
					.text()
				// data.image = htmlData('.slick-slide > div > div > img').attr('src')
				data.currency = 'usd'
				break

			case 'www.williams-sonoma.com':
				data.name = htmlData('[data-test-id="product-title"]').text()
				data.price = htmlData('[data-test-id="priceLabel"]')
					.find('.amount')
					.text()
				if (!data.price) {
					data.price = htmlData('[data-test-id="priceLabel"]')
						.find('.amount')
						.text()
				}
				data.image = htmlData('[data-test-id="magnifier"]')
					.find('div > div > div > div > img')
					.attr('src')
				data.currency = 'usd'
				break

			case 'www.bedbathandbeyond.com':
				data.name = htmlData('[data-ssr="prodDetSsr.data.PRODUCT_DETAILS"]')
					.find('div.amp-hidden > h1')
					.text()
				data.price = htmlData('[data-test-id="priceLabel"]')
					.find('.amount')
					.text()
				data.image = htmlData('[data-test-id="magnifier"]')
					.find('div > div > div > div > img')
					.attr('src')
				data.currency = 'usd'
				break

			default:
				return res
					.status(200)
					.json({ error: false, message: 'Gift List', data })
		}
		return res.status(200).json({ error: false, message: 'Gift List', data })
	}
}
