const request = require('supertest');
const app = require('../../app');
const {Coin} = require("../../models/Coin");
const {Sentiment} = require("../../models/Sentiment");
const {TFdict} = require("../../models/tf-dict");

describe('/data', ()=>{
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
        await Sentiment.deleteMany({}).exec();
        await TFdict.deleteMany({}).exec();
    })

    afterAll(async () => {
        await Coin.deleteMany({}).exec();
        await Sentiment.deleteMany({}).exec();
        await TFdict.deleteMany({}).exec();
        await connection.close();
    });

    const mockSent =
    {
        timestamp: Date.now(),
        identifiers: ["TEST"],
        sentiment: 1,
        interaction: 20,
        url: "testpost1",
        influence: 50,
        uuid: "testid0",
        source: 'reddit'
    }

    const mockCoin = {
        identifier: "TEST",
        display_name: "TestCoin",
        icon: "testurl",
        price: 1,
        tags: ["TEST", "TestCoin"],
    }

    const mockTfdict ={
        timestamp: Date.now(),
        url: "testurl",
        words: {
            "this": 4,
            "is": 3,
            "a": 2,
            "test": 1
        }
    }

    const mockWords =[
        {
            identifier: "TEST",
            word: "TEST",
            total: 1,
            url: "testurl",
            timestamp: Date.now()
        },
        {
            identifier: "TEST",
            word: "TEST",
            total: 1,
            url: "testurl1",
            timestamp: Date.now()
        },
        {
            identifier: "TEST",
            word: "TEST",
            total: 1,
            url: "testurl2",
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 13)
        }
    ]

    describe('POST', ()=>{

        it('403 if url already exist', async()=>{
            await Sentiment.create(mockSent);
            await request(app).post('/data').send({url: mockSent.url}).expect(403);
        })

        it('success if url dont exist', async()=>{
            const find = await Sentiment.find({url: mockSent.url}).exec();
            expect(find.length).toBe(0);
            await request(app).post('/data').send({url: mockSent.url}).expect(200);
        })

        describe('tfdict', ()=>{
            it('404 if coin not exist', async ()=>{
                await request(app).post('/data/tfdict').send(mockTfdict).expect(404);
            })

            it('success insert', async ()=>{
                await Coin.create(mockCoin);
                await request(app).post('/data/tfdict/TEST').send(mockTfdict).expect(201);
                const inserted = await TFdict.find({identifier: mockCoin.identifier}).exec();
                expect(inserted.length).toBe(4);
                const words = inserted.map((item)=>{return item.word});
                expect(words).toEqual(['this','is','a','test']);
            })

            it('insert keep right format', async()=>{
                await Coin.create(mockCoin);
                await request(app).post('/data/tfdict/TEST').send(mockTfdict).expect(201);
                const inserted = await TFdict.findOne({identifier: mockCoin.identifier, word: "test"}).exec();
                const expected = {
                    identifier: "TEST",
                    word: "test",
                    total: 1,
                    url: mockTfdict.url,
                    timestamp: new Date(mockTfdict.timestamp)
                }
                expect(inserted).toMatchObject(expected);
            })
        })
    })

    describe('GET', ()=>{
        it('/tfdict 404 when coin not exist', async ()=>{
            await request(app).get('/data/tfdict/NOT').expect(404);
        })

        it('/tfdict get correct list', async ()=>{
            await Coin.create(mockCoin);
            await request(app).post('/data/tfdict/TEST').send(mockTfdict).expect(201);
            const res = await request(app).get('/data/tfdict/TEST').expect(200);
            expect(res.body.length).toBe(4);
            const expected = ["this", "is", "a", "test"];
            const words = res.body.map((item)=> item._id);
            expect(words).toEqual(expected);
        })

        it('/tfdict length param works', async ()=>{
            await Coin.create(mockCoin);
            await request(app).post('/data/tfdict/TEST').send(mockTfdict).expect(201);
            let res;
            res = await request(app).get('/data/tfdict/TEST').query({length: 3}).expect(200);
            expect(res.body.length).toBe(3);
            res = await request(app).get('/data/tfdict/TEST').query({length: 2}).expect(200);
            expect(res.body.length).toBe(2);
            res = await request(app).get('/data/tfdict/TEST').query({length: 1}).expect(200);
            expect(res.body.length).toBe(1);
        })

        it('/tfdict 404 if no words in db', async ()=>{
            await Coin.create(mockCoin);
            await request(app).get('/data/tfdict/TEST').expect(404);
        })

        it('/urls 404 when coin not exist', async ()=>{
            await request(app).get('/data/urls/NOT/word').expect(404);
        })

        it('/urls 404 when word not exist', async()=>{
            await Coin.create(mockCoin);
            await request(app).get('/data/urls/TEST/word').expect(404);
        })

        it('/urls successful retrieve', async()=>{
            await Coin.create(mockCoin);
            await TFdict.insertMany(mockWords);
            const res = await request(app).get('/data/urls/TEST/test').expect(200);
            const expected = mockWords.map((item)=> item.url);
            expected.forEach((item)=>{
                expect(res.body.urls).toContain(item);
            })
        })

        it('/urls length param works', async()=>{
            await Coin.create(mockCoin);
            await TFdict.insertMany(mockWords);
            let res;
            res = await request(app).get('/data/urls/TEST/test').query({length: 3}).expect(200);
            expect(res.body.urls.length).toBe(3);
            res = await request(app).get('/data/urls/TEST/test').query({length: 2}).expect(200);
            expect(res.body.urls.length).toBe(2);
            res = await request(app).get('/data/urls/TEST/test').query({length: 1}).expect(200);
            expect(res.body.urls.length).toBe(1);
        })
    })

    describe('DELETE', ()=>{
        it('deletes 0 when database empty', async ()=>{
            const words = await TFdict.find({}).exec();
            expect(words.length).toBe(0);
            const res = await request(app).delete('/data/tfdict').expect(200);
            expect(res.text).toContain("deleted 0 objects");
        })

        it('deletes 0 when database only has new', async ()=> {
            await TFdict.insertMany(mockWords.slice(0,2));
            const words = await TFdict.find({}).exec();
            expect(words.length).toBe(2);
            const res = await request(app).delete('/data/tfdict').expect(200);
            expect(res.text).toContain("deleted 0 objects");
        })

        it('successfully deletes only old objects', async ()=> {
            await TFdict.insertMany(mockWords);
            let words;
            words = await TFdict.find({}).exec();
            expect(words.length).toBe(3);
            const res = await request(app).delete('/data/tfdict').expect(200);
            expect(res.text).toContain("deleted 1 objects");
            words = await TFdict.find({}).exec();
            expect(words.length).toBe(2);
        })
    })
})
