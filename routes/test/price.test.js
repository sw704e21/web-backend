const request = require('supertest');
const app = require('../../app');
const {Coin} = require("../../models/Coin");
const {Price} = require("../../models/Price");

describe('/price', ()=>{
    let connection;
    let db;

    beforeAll(async () => {
        connection = app.db;
        connection.once("open", function () {
            console.log("Connected successfully!");
        });
        db = connection.db;
    });

    beforeEach(async ()=>{
        await Coin.deleteMany({}).exec();
        await Price.deleteMany({}).exec();
    })

    afterAll(async () => {
        await Coin.deleteMany({}).exec();
        await Price.deleteMany({}).exec();
        await connection.close();
    });

    const mockCoin = {
        identifier: "TEST",
        display_name: "TestCoin",
        icon: "testurl",
        price: 1,
        tags: ["TEST", "TestCoin"],
    }
    const mockPrice = {
        identifier: "TEST",
        price: 1,
        timestamp: Date.now()
    }

    it('POST 404 when coin not exist', async ()=>{
        await request(app).post('/price').send(mockPrice).expect(404);
    })

    it('POST inserts correctly', async ()=>{
        await Coin.create(mockCoin);
        const res = await request(app).post('/price').send(mockPrice).expect(201);
        let inserted = Price.findOne({_id: res.body._id}).exec();
        expect(res.body).toMatchObject(inserted);
    })

    it('POST keep only 24 in db', async ()=>{
        await Coin.create(mockCoin);
        let insert = []
        for(let i = 0; i < 24; i++){
            insert.push(mockPrice);
        }
        let inserted = await Price.insertMany(insert);
        expect(inserted.length).toBe(24);
        await request(app).post('/price').send(mockPrice).expect(201);
        const prices = await Price.find({identifier: mockPrice.identifier}).exec();
        expect(prices.length).toBe(24);
    })

    it('PATCH 404 when coin not exist', async ()=>{
        await request(app).patch('/price/NOT/5').expect(404);
    })

    it('PATCH updates correctly', async ()=>{
        await Coin.create(mockCoin);
        const res = await request(app).patch('/price/TEST/5').expect(200);
        const testcoin = await Coin.findOne({identifier: mockCoin.identifier}).exec();
        expect(testcoin.price).toBe(5);
    })
})
