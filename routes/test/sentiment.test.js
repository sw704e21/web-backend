const request = require('supertest');
const app = require('../../app');
const {Sentiment} = require("../../models/Sentiment");

describe('/sentiment', ()=>{
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
        await Sentiment.deleteMany({}).exec();
    })

    afterAll(async () => {
        await Sentiment.deleteMany({}).exec();
        await connection.close();
    });

    const redditSent =  [
        {
            timestamp: Date.now(),
            identifiers: ["TEST"],
            sentiment: 1,
            interaction: 20,
            url: "reddit0",
            influence: 50,
            uuid: "redditid0",
            source: 'reddit'
        },
        {
            timestamp: Date.now(),
            identifiers: ["TEST"],
            sentiment: -0.5,
            interaction: 350,
            url: "reddit1",
            influence: 5,
            uuid: "redditid1",
            source: 'reddit'
        },
        {
            timestamp: Date.now(),
            identifiers: ["TEST"],
            sentiment: 1,
            interaction: 1000,
            url: "reddit2",
            influence: 1200,
            uuid: "redditid2",
            source: 'reddit'
        }
    ]

    const twitterSent = [
        {
            timestamp: Date.now(),
            identifiers: ["TEST"],
            sentiment: 1,
            interaction: 20,
            url: "twittertest1",
            influence: 50,
            uuid: "twitterid0",
            source: 'twitter'
        },
        {
            timestamp: Date.now(),
            identifiers: ["TEST"],
            sentiment: -0.5,
            interaction: 350,
            url: "twittertest1",
            influence: 5,
            uuid: "twitterid1",
            source: 'twitter'
        },
        {
            timestamp: Date.now(),
            identifiers: ["TEST"],
            sentiment: 1,
            interaction: 1000,
            url: "twitttertest2",
            influence: 1200,
            uuid: "twitterid2",
            source: 'twitter'
        }
    ]


    describe('GET', ()=>{
        it('return empty list when db is empty', async ()=>{
            let res;
            res = await request(app).get('/sentiment/ids/reddit').expect(200);
            expect(res.body.length).toBe(0);
            res = await request(app).get('/sentiment/ids/twitter').expect(200);
            expect(res.body.length).toBe(0);
        })

        it('get only reddit post ids', async ()=>{
            await Sentiment.insertMany(redditSent);
            let res = await request(app).get('/sentiment/ids/reddit').expect(200);
            expect(res.body.length).toBe(3);
            expect(res.body).toEqual(redditSent.map((item)=>{return item.uuid}))
        })

        it('get only twitter post ids', async ()=>{
            await Sentiment.insertMany(twitterSent);
            let res = await request(app).get('/sentiment/ids/twitter').expect(200);
            expect(res.body.length).toBe(3);
            expect(res.body).toEqual(twitterSent.map((item)=>{return item.uuid}))
        })
    })
})
