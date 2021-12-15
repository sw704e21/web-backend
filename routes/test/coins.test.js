const request = require('supertest');
const app = require('../../app');
const {Coin} = require('../../models/Coin');
const {Score} = require('../../models/Score');
const {Sentiment} = require('../../models/Sentiment');

describe('/coins', () => {
    let connection;
    let db;

    const mockCoin = {
        identifier: "TEST",
        display_name: "TestCoin",
        icon: "testurl",
        price: 1,
        tags: ["TEST", "TestCoin"],
    }
    const mockScore = {
        identifier: "TEST",
        price_score: 1,
        social_score: 1,
        average_sentiment: 1,
        correlation_rank: 1,
        final_score: 16,
        timestamp: Date.now()
    }
    const mockSent = [
        {
            timestamp: Date.now(),
            identifiers: ["TEST"],
            sentiment: 1,
            interaction: 20,
            url: "testpost1",
            influence: 50,
            uuid: "testid0",
            source: 'reddit'
        },
        {
            timestamp: Date.now(),
            identifiers: ["TEST"],
            sentiment: -0.5,
            interaction: 350,
            url: "testpost2",
            influence: 5,
            uuid: "testid1",
            source: 'reddit'
        },
        {
            timestamp: Date.now(),
            identifiers: ["TEST"],
            sentiment: 1,
            interaction: 1000,
            url: "testpost3",
            influence: 1200,
            uuid: "testid2",
            source: 'reddit'
        },
        {
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 30),
            identifiers: ["TEST"],
            sentiment: 1,
            interaction: 20,
            url: "testpost4",
            influence: 250,
            uuid: "testid3",
            source: 'reddit'
        },
        {
            timestamp: new Date(2021, 5,5 ),
            identifiers: ["TEST"],
            sentiment: 0.8,
            interaction: 1000,
            url: "testpost5",
            influence: 1200,
            uuid: "testid4",
            source: 'reddit'
        },
    ]

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
    })

    afterAll(async () => {
        await Coin.deleteMany({}).exec();
        await Score.deleteMany({}).exec();
        await Sentiment.deleteMany({}).exec();
        await connection.close();
    });

    describe('GET', ()=>{
        it('/info can join info',async ()=>{

            await Coin.create(mockCoin);

            await Score.create(mockScore);

            await Sentiment.insertMany(mockSent);
            let res = await request(app).get('/coins/TEST/info').expect(200);
            const expectedInfo = {
                identifier: 'TEST',
                displayName: 'TestCoin',
                icon: 'testurl',
                price: 1,
                price_score: 1,
                social_score: 1,
                average_sentiment: 1,
                correlation_rank: 1,
                final_score: 16
            }
            expect(res.body).toMatchObject(expectedInfo);
        })

        it('/info correct aggregation', async ()=> {
            await Coin.create(mockCoin);
            await Score.create(mockScore);

            await Sentiment.insertMany(mockSent);
            let res = await request(app).get('/coins/TEST/info').expect(200);
            const expectedInfo = {
                mostInteractions: 1370,
                mentions: 3,
                posSentiment: 2,
                mostInfluence: 1200,
                identifier: 'TEST',
                negSentiment: 0.5,
                relSentiment: 3.0,
                relMentions: 200,
                displayName: 'TestCoin',
                icon: 'testurl',
                price: 1,
                price_score: 1,
                social_score: 1,
                average_sentiment: 1,
                correlation_rank: 1,
                final_score: 16
            }
            expect(res.body).toEqual(expectedInfo)

        })

        it('/info returns 404 when not exist', async ()=>{
            await request(app).get('/coins/NOT').expect(404)
        })

        it('/:identifier returns 7 days default', async ()=>{
            await Coin.create(mockCoin);
            const res = await request(app).get('/coins/TEST').expect(200);
            expect(res.body.length).toBe(24 * 7);
        })

        it('/:identifier age parameter works', async ()=>{
            await Coin.create(mockCoin);
            let res;
            res = await request(app).get('/coins/TEST/?age=1').expect(200);
            expect(res.body.length).toBe(24);
            res = await request(app).get('/coins/TEST/?age=30').expect(200);
            expect(res.body.length).toBe(24 * 30);
            res = await request(app).get('/coins/TEST/?age=90').expect(200);
            expect(res.body.length).toBe(24 * 90);
            res = await request(app).get('/coins/TEST/?age=365').expect(200);
            expect(res.body.length).toBe(24 * 365);
        })

        it('/identifier aggregates correctly', async ()=>{

            await Coin.create(mockCoin);
            const mockSent = [
                {
                    timestamp: Date.now(),
                    identifiers: ["TEST"],
                    sentiment: 1,
                    interaction: 20,
                    url: "testpost1",
                    influence: 50,
                    uuid: "testid0",
                    source: 'reddit'
                },
                {
                    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 1.5),
                    identifiers: ["TEST"],
                    sentiment: -0.5,
                    interaction: 350,
                    url: "testpost2",
                    influence: 5,
                    uuid: "testid1",
                    source: 'reddit'
                },
                {
                    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 1.5),
                    identifiers: ["TEST"],
                    sentiment: 1,
                    interaction: 1000,
                    url: "testpost3",
                    influence: 1200,
                    uuid: "testid2",
                    source: 'reddit'
                },
                {
                    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2.5),
                    identifiers: ["TEST"],
                    sentiment: 1,
                    interaction: 20,
                    url: "testpost4",
                    influence: 250,
                    uuid: "testid3",
                    source: 'reddit'
                }
            ]
            await Sentiment.insertMany(mockSent);
            const expect0 = {
                time: 0,
                mentions: 1,
                interaction: 20,
                sentiment: 1,
                negSentiment: 0,
                posSentiment: 1,
                mostInfluence: 50
            }
            const expect1 = {
                time: 1,
                mentions: 2,
                interaction: 1350,
                sentiment: 0.5,
                negSentiment: 0.5,
                posSentiment: 1,
                mostInfluence: 1200
            }
            const expect2 = {
                time: 2,
                mentions: 1,
                interaction: 20,
                sentiment: 1,
                negSentiment: 0,
                posSentiment: 1,
                mostInfluence: 250
            }
            const res = await request(app).get('/coins/TEST').expect(200);
            expect(res.body.length).toBe(24*7);
            expect(res.body[0]).toEqual(expect0);
            expect(res.body[1]).toEqual(expect1);
            expect(res.body[2]).toEqual(expect2);
        })

        it('/info no score throws error', async ()=>{
            await Coin.create(mockCoin);
            await request(app).get('/coins/TEST/info').expect(404);
        })

        describe('/all', ()=>{
            const mockCoins = [
                {
                    identifier: "TEST",
                    display_name: "TestCoin",
                    icon: "testurl",
                    price: 1,
                    tags: ["TEST", "TestCoin"],
                },{
                    identifier: "SOME",
                    display_name: "SomeCoin",
                    icon: "someurl",
                    price: 2,
                    tags: ["SOME", "SomeCoin"],
                },{
                    identifier: "ST",
                    display_name: "SomeTest",
                    icon: "sometesturl",
                    price: 0.1,
                    tags: ["ST", "SomeTest"]
                }]
            const mockScores = [
                {
                    identifier: "TEST",
                    price_score: 1,
                    social_score: 2,
                    average_sentiment: 3,
                    correlation_rank: 4,
                    final_score: 16,
                    timestamp: Date.now()
                },
                {
                    identifier: "SOME",
                    price_score: 2,
                    social_score: 1,
                    average_sentiment: 4,
                    correlation_rank: 3,
                    final_score: 17,
                    timestamp: Date.now()
                },
                {
                    identifier: "ST",
                    price_score: 4,
                    social_score: 3,
                    average_sentiment: 2,
                    correlation_rank: 1,
                    final_score: 18,
                    timestamp: Date.now()
                }
            ]
            const mockSent = [
                {
                    timestamp: Date.now(),
                    identifiers: ["TEST"],
                    sentiment: 1,
                    interaction: 20,
                    url: "testpost1",
                    influence: 50,
                    uuid: "testid0",
                    source: 'reddit'
                },
                {
                    timestamp: Date.now(),
                    identifiers: ["SOME"],
                    sentiment: -0.5,
                    interaction: 350,
                    url: "testpost2",
                    influence: 5,
                    uuid: "testid1",
                    source: 'reddit'
                },
                {
                    timestamp: Date.now(),
                    identifiers: ["ST"],
                    sentiment: 0.8,
                    interaction: 1000,
                    url: "testpost3",
                    influence: 1200,
                    uuid: "testid2",
                    source: 'reddit'
                },

            ]

            it('gives a list', async ()=>{

                await Coin.insertMany(mockCoins);

                await Score.insertMany(mockScores);

                await Sentiment.insertMany(mockSent);

                const res = await request(app).get('/coins/all').expect(200);
                expect(res.body.length).toBe(3);
                let idents = res.body.map((item)=>{return item.identifier});
                expect(idents).toContain("SOME");
                expect(idents).toContain("TEST");
                expect(idents).toContain("ST")
            });

            it('length param works', async ()=>{
                await Coin.insertMany(mockCoins);
                await Score.insertMany(mockScores);
                await Sentiment.insertMany(mockSent);

                let res;
                res = await request(app).get('/coins/all/?length=1').expect(200);
                expect(res.body.length).toBe(1);
                res = await request(app).get('/coins/all/?length=2').expect(200);
                expect(res.body.length).toBe(2);
                res = await request(app).get('/coins/all/?length=3').expect(200);
                expect(res.body.length).toBe(3);

            })

            it('sortParam works', async ()=>{
                await Coin.insertMany(mockCoins);
                await Score.insertMany(mockScores);
                await Sentiment.insertMany(mockSent);

                let res;
                let expected;
                let actual;
                res = await request(app).get('/coins/all/?sortParam=displayName').expect(200);
                expected = ["SOME", "ST", "TEST"];
                actual = res.body.map((item)=>{return item.identifier});
                expect(actual).toEqual(expected);
                res = await request(app).get('/coins/all/?sortParam=-displayName').expect(200);
                expected = ["TEST", "ST", "SOME"];
                actual = res.body.map((item)=>{return item.identifier});
                expect(actual).toEqual(expected);
                res = await request(app).get('/coins/all/?sortParam=-mostInteractions').expect(200);
                expected = ["ST", "SOME", "TEST"];
                actual = res.body.map((item)=>{return item.identifier});
                expect(actual).toEqual(expected);
                res = await request(app).get('/coins/all/?sortParam=-mostInfluence').expect(200);
                expected = ["ST", "TEST", "SOME"];
                actual = res.body.map((item)=>{return item.identifier});
                expect(actual).toEqual(expected);
                res = await request(app).get('/coins/all/?sortParam=-relSentiment').expect(200);
                expected = ["TEST", "ST", "SOME"];
                actual = res.body.map((item)=>{return item.identifier});
                expect(actual).toEqual(expected);
                res = await request(app).get('/coins/all/?sortParam=-final_score').expect(200);
                expected = ["ST", "SOME", "TEST"];
                actual = res.body.map((item)=>{return item.identifier});
                expect(actual).toEqual(expected);

            })

            it('no scores throws error', async ()=>{
                await Coin.insertMany(mockCoins);
                await Sentiment.insertMany(mockSent);

                await request(app).get('/coins/all').expect(500);
            })

        })

        it('/search find on identifier', async ()=>{
            await Coin.create(mockCoin);
            let res = await request(app).get('/coins/search/TEST').expect(200);
            expect(res.body.length).toBe(1);
            expect(res.body[0].identifier).toBe("TEST")
        })

        it('/search find on displayName', async ()=>{
            await Coin.create(mockCoin);
            let res = await request(app).get('/coins/Search/Coin').expect(200);
            expect(res.body.length).toBe(1);
            expect(res.body[0].identifier).toBe("TEST")
        });

        it('/search not case sensitive', async()=>{
            await Coin.create(mockCoin);
            let res = await request(app).get('/coins/Search/c').expect(200);
            expect(res.body.length).toBe(1);
            expect(res.body[0].identifier).toBe("TEST");
        })

        it('/search can return list', async ()=> {
            const mockCoins = [
                {
                    identifier: "TEST",
                    display_name: "TestCoin",
                    icon: "testurl",
                    price: 1,
                    tags: ["TEST", "TestCoin"],
                },{
                    identifier: "SOME",
                    display_name: "SomeCoin",
                    icon: "someurl",
                    price: 2,
                    tags: ["SOME", "SomeCoin"],
                },{
                    identifier: "ST",
                    display_name: "SomeTestCoin",
                    icon: "sometesturl",
                    price: 0.1,
                    tags: ["ST", "SomeTest"]
                }]
            await Coin.insertMany(mockCoins);
            let res = await request(app).get('/coins/Search/Coin').expect(200);
            expect(res.body.length).toBe(3);

        })
    })

    describe('POST', ()=>{
        it('throw error if coin dont exist', async ()=>{
            await request(app).post('/coins').send(mockSent[0]).expect(404);
        })

        it('throw error if post id already exist', async ()=>{
            await Coin.create(mockCoin);
            await Sentiment.create(mockSent[0]);
            await request(app).post('/coins').send(mockSent[0]).expect(403);
        })

        it('insert correctly', async ()=>{
            await Coin.create(mockCoin);
            let res = await request(app).post('/coins').send(mockSent[4]).expect(201);
            let inserted = await Sentiment.findOne({uuid: mockSent[4].uuid}).exec();
            inserted = inserted._doc;
            res.body.timestamp = new Date(res.body.timestamp)
            expect(res.body).toMatchObject(inserted);
        })
    })

    describe('PATCH', ()=>{
        it('404 when post not exist', async ()=>{
            await request(app).patch('/coins').query({uuid: "testid", interactions: 2}).expect(404);
        })

        it('patch success', async ()=>{
            await Sentiment.create(mockSent[0]);
            const init = await Sentiment.findOne({uuid: mockSent[0].uuid}).exec();
            expect(init.interaction).toBe(mockSent[0].interaction);
            await request(app).patch(`/coins`).query({uuid: init.uuid, interactions: 2 * init.interaction}).expect(200);
            const updated = await Sentiment.findOne({uuid: init.uuid}).exec();
            expect(updated.interaction).not.toBe(init.interaction);
            expect(updated.interaction).toBe(2 * init.interaction);
        })
    })
});
