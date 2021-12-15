const request = require('supertest');
const app = require('../../app');
const {Coin} = require('../../models/Coin');
const {Score} = require('../../models/Score');
const {Sentiment} = require('../../models/Sentiment');

describe('/coins', () => {
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
        const mockCoins = [{
            identifier: "TEST",
            display_name: "TestCoin",
            icon: "testurl",
            tags: ["TEST", "TestCoin"],
            price: 1
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
        await Coin.insertMany(mockCoins);
        const mockScores = [
            {
                identifier: "TEST",
                price_score: 1,
                social_score: 1,
                average_sentiment: 1,
                correlation_rank: 1,
                final_score: 16,
                timestamp: Date.now()
            },
            {
                identifier: "SOME",
                price_score: 1,
                social_score: 1,
                average_sentiment: 1,
                correlation_rank: 1,
                final_score: 16,
                timestamp: Date.now()
            },
            {
                identifier: "ST",
                price_score: 1,
                social_score: 1,
                average_sentiment: 1,
                correlation_rank: 1,
                final_score: 16,
                timestamp: Date.now()
            }
        ]
        await Score.insertMany(mockScores)
    })

    afterAll(async () => {
        await connection.close();
    });

    describe('GET', ()=>{
        it('info ',async ()=>{
            const mockSent = [
                {
                    timestamp: Date.now(),
                    identifiers: ["TEST"],
                    sentiment: 1,
                    interaction: 20,
                    url: "testpost1",
                    influence: 50,
                    uuid: "testid",
                    source: 'reddit'
                }
            ]
            await Sentiment.insertMany(mockSent);
            let res = await request(app).get('/coins/TEST/info').expect(200);
            console.log(res.body)
        })
    })
});

