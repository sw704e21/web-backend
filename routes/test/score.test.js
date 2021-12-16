const request = require('supertest');
const app = require('../../app');
const {Coin} = require("../../models/Coin");
const {Score} = require("../../models/Score");
const {Sentiment} = require("../../models/Sentiment");
const {Price} = require('../../models/Price');

describe('/score', ()=>{
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
        await Score.deleteMany({}).exec();
        await Sentiment.deleteMany({}).exec();
        await Price.deleteMany({}).exec();
    })

    afterAll(async () => {
        await Coin.deleteMany({}).exec();
        await Score.deleteMany({}).exec();
        await Sentiment.deleteMany({}).exec();
        await Price.deleteMany({}).exec();
        await connection.close();
    });

    const mockCoin = {
        identifier: "TEST",
        display_name: "TestCoin",
        icon: "testicon",
        price: 1,
        tags: ["TEST", "TestCoin"]
    };

    const mockSents = [
        {
            timestamp: Date.now(),
            identifiers: ["TEST"],
            sentiment: 1,
            interaction: 10,
            url: "testurl0",
            influence: 20,
            uuid: "testid0",
            source: 'reddit'
        },
        {
            timestamp: Date.now(),
            identifiers: ["TEST", "SOME"],
            sentiment: -1,
            interaction: 10,
            url: "testurl1",
            influence: 20,
            uuid: "testid1",
            source: 'reddit'
        }

    ]

    const mockPrices = [
        {
            identifier: "TEST",
            price: 1,
            timestamp: Date.now()
        },
        {
            identifier: "TEST",
            price: 2,
            timestamp: new Date(Date.now() - 1000 * 60 * 60)
        }
    ]

    const mockScores = [
        {
            identifier: "TEST",
            price_score: 1,
            social_score: 2,
            average_sentiment: 3,
            correlation_rank: 4,
            final_score: 20,
            timestamp: Date.now()
        },
        {
            identifier: "TEST",
            price_score: 4,
            social_score: 3,
            average_sentiment: 2,
            correlation_rank: 1,
            final_score: 20,
            timestamp: Date.now()
        }
    ]


    describe('GET', ()=>{
        describe('/mentions', ()=>{
            it('404 when coin not exist', async ()=>{
                await request(app).get('/score/mentions/NOT').expect(404);
            })

            it('always list of 24', async()=>{
                await Coin.create(mockCoin);
                let res;
                res = await request(app).get('/score/mentions/TEST').expect(200);
                expect(res.body.length).toBe(24);
                let insert = mockSents[0];
                insert.timestamp = new Date(Date.now() - 1000 * 60 * 60 * 3.1);
                await Sentiment.create(insert);
                res = await request(app).get('/score/mentions/TEST').expect(200);
                expect(res.body.length).toBe(24);
                expect(res.body[3]).toBe(1);
            })

            it('can unwind multiple identifiers in aggregation', async()=>{
                await Coin.create(mockCoin);
                await Sentiment.create(mockSents[1]);
                const res = await request(app).get('/score/mentions/TEST').expect(200);
                expect(res.body[0]).toBe(1);
            })
        })

        describe('/sentiment', ()=>{
            it('404 when coin not exist', async ()=>{
                await request(app).get('/score/sentiment/NOT').expect(404)
            })

            it('always list of 24', async ()=>{
                await Coin.create(mockCoin);
                let res;
                res = await request(app).get('/score/sentiment/TEST').expect(200);
                expect(res.body['24hours']).toBe(0);
                expect(res.body.list.length).toBe(24);
                await Sentiment.create(mockSents[0]);
                res = await request(app).get('/score/sentiment/TEST').expect(200);
                expect(res.body['24hours']).not.toBe(0);
                expect(res.body.list.length).toBe(24);
            })

            it('can unwind multiple identifiers in aggregation', async ()=>{
                await Coin.create(mockCoin);
                await Sentiment.create(mockSents[1]);
                const res = await request(app).get('/score/sentiment/TEST').expect(200);
                expect(res.body.list[0]).toBe(-1)
                expect(res.body['24hours']).toBe(-1 / 24);
            })

        })

        describe('/interactions', ()=>{
            it('404 when coin not exist', async ()=>{
                await request(app).get('/score/interactions/NOT').expect(404);
            })

            it('always list of 24', async ()=>{
                await Coin.create(mockCoin);
                let res;
                res = await request(app).get('/score/interactions/TEST').expect(200);
                expect(res.body.length).toBe(24);
                await Sentiment.create(mockSents[0]);
                res = await request(app).get('/score/interactions/TEST').expect(200);
                const sum = res.body.reduce((a,b)=> a+b, 0);
                expect(sum).toBe(10);
                expect(res.body.length).toBe(24);
            })

            it('can unwind multiple identifiers in aggregation', async()=>{
                await Coin.create(mockCoin);
                await Sentiment.create(mockSents);
                const res = await request(app).get('/score/interactions/TEST').expect(200);
                expect(res.body[0]).toBe(10);
            })


        })

        describe('/price', ()=>{
            it('404 when coin not exist', async ()=>{
                await request(app).get('/score/price/NOT').expect(404);
            })

            it('always list of 24', async ()=>{
                await Coin.create(mockCoin);
                let res;
                res = await request(app).get('/score/price/TEST').expect(200);
                expect(res.body.length).toBe(24);
                await Price.create(mockPrices[0]);
                res = await request(app).get('/score/price/TEST').expect(200);
                expect(res.body.length).toBe(24);
                expect(res.body[0]).toBe(mockPrices[0].price);
            })

            it('sort corretly', async ()=>{
                await Coin.create(mockCoin);
                await Price.insertMany(mockPrices);
                const res = await request(app).get('/score/price/TEST').expect(200);
                expect(res.body[0]).toBe(mockPrices[0].price);
                expect(res.body[1]).toBe(mockPrices[1].price)
            })
        })

        describe('/:identifier', ()=>{
            it('404 when coin not exist', async ()=>{
                await request(app).get('/score/NOT').expect(404);
            });

            it('returns a list', async ()=>{
                await Coin.create(mockCoin);
                await Score.insertMany(mockScores);
                const res = await request(app).get('/score/TEST').expect(200);
                expect(res.body.length).toBe(2);
                expect(res.body[0]).not.toEqual(res.body[1]);
            })
        })
    })

    describe('POST', ()=>{
        it('404 if coin not found', async()=>{
            await request(app).post('/score').send(mockScores[0]).expect(404);
        })

        it('inserted correctly', async()=>{
            await Coin.create(mockCoin);
            let res = await request(app).post('/score').send(mockScores[0]).expect(201);
            let inserted = Score.findOne({_id: res.body._id}).exec();
            expect(res.body).toMatchObject(inserted);
        })
    })
})
