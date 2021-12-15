const request = require('supertest');
const app = require('../../app');
const {Coin} = require('../../models/Coin');

describe('/track', () => {
    let connection;
    let db;

    beforeAll(async () => {
        connection = app.db;
        await connection.once("open", function () {
            console.log("Connected successfully!");
        });
        db = connection.db;

    });

    afterAll(async () => {
        await connection.close();

    });

    beforeEach(async () => {
        await Coin.deleteMany({});
    });

    describe('GET', () =>{
        it('should return 1 coin', async () => {
            const mockCoin = {identifier: "TEST",
                display_name: "TestCoin",
                icon: "testurl",
                tags: ["TEST", "TestCoin"]
            }

            const insertedCoin = await Coin.create(mockCoin);

            expect(insertedCoin._doc).toMatchObject(mockCoin);

            const res = await request(app).get('/track').expect(200);
            expect(res.body.length).toBe(1);
            let recievedCoin = res.body[0];
            delete insertedCoin._id
            expect(recievedCoin).toMatchObject(insertedCoin._doc);
        });

        it('should return many', async ()=> {
            const mockCoins = [{
                identifier: "TEST",
                display_name: "TestCoin",
                icon: "testurl",
                price: 1,
                tags: ["TEST", "TestCoin"]
            },{
                identifier: "SOME",
                display_name: "SomeCoin",
                icon: "someurl",
                price: 2,
                tags: ["SOME", "SomeCoin"]
            },{
                identifier: "ST",
                display_name: "SomeTest",
                icon: "sometesturl",
                price: 0.1,
                tags: ["ST", "SomeTest"]
            }];

            await Coin.insertMany(mockCoins);
            const res = await request(app).get('/track').expect(200);
            expect(res.body.length).toBe(3);
            expect(res.body[0].identifier).toBe("TEST");
            expect(res.body[1].identifier).toBe("SOME");
            expect(res.body[2].identifier).toBe("ST");

        })

        it('can get all tags', async ()=>{
            const mockCoins = [{
                identifier: "TEST",
                display_name: "TestCoin",
                icon: "testurl",
                price: 1,
                tags: ["TEST", "TestCoin"]
            },{
                identifier: "SOME",
                display_name: "SomeCoin",
                icon: "someurl",
                price: 2,
                tags: ["SOME", "SomeCoin"]
            },{
                identifier: "ST",
                display_name: "SomeTest",
                icon: "sometesturl",
                price: 0.1,
                tags: ["ST", "SomeTest"]
            }];

            await Coin.insertMany(mockCoins);

            let req = await request(app).get('/track/tags').expect(200);
            const expectList = ['TEST', 'TestCoin', 'SOME', 'SomeCoin', "ST", "SomeTest"];
            let actualList = [];
            req.body.forEach((item)=>{
                item.tags.forEach((tag)=>{
                    actualList.push(tag)
                })
            })
            expect(actualList).toEqual(expectList);
        })
    })

    describe('POST', () => {
        it('inserted correcly', async () => {
            const mockCoin = {identifier: "TEST",
                display_name: "TestCoin",
                icon: "testurl",
                tags: ["TEST", "TestCoin"]
            }
            let res = await request(app).post('/track').send(mockCoin).expect(201)
            expect(res.body.identifier).toBe("TEST");
            let resultcoin = await Coin.findOne({identifier: "TEST"});
            resultcoin = resultcoin._doc
            delete resultcoin._id
            expect(res.body).toMatchObject(resultcoin)
        })

        it('icon is fetched', async ()=>{
            const mockCoin = {identifier: "TEST",
                display_name: "TestCoin",
                icon: "testurl",
                tags: ["TEST", "TestCoin"]
            }
            let res = await request(app).post('/track').send(mockCoin).expect(201)
            expect(res.body).toHaveProperty("icon")
            expect(res.body.icon).toContain("https")
        })

        it('reject if identifier already exist', async ()=>{
            const mockCoin = {identifier: "TEST",
                display_name: "TestCoin",
                icon: "testurl",
                tags: ["TEST", "TestCoin"]
            }
            await Coin.create(mockCoin);
            await request(app).post('/track').send(mockCoin).expect(409)
        })

        it('identifier is capitalised', async ()=>{
            const mockCoin = {identifier: "test",
                display_name: "TestCoin",
                icon: "testurl",
                tags: ["TEST", "TestCoin"]
            }
            let res = await request(app).post('/track').send(mockCoin).expect(201)
            expect(res.body.identifier).toEqual("TEST")
        })
    })

    describe('PUT', ()=>{
        it('updates icon', async ()=>{
            const mockCoin = {
                identifier: "TEST",
                display_name: "TestCoin",
                icon: "testurl",
                tags: ["TEST", "TestCoin"]
            }
            await Coin.create(mockCoin);
            let resultcoin = await Coin.findOne({identifier: "TEST"});
            await request(app).put(`/track/${resultcoin._id}`).send(mockCoin).expect(200);
            let newresult = await Coin.findOne({identifier: "TEST"});
            expect(newresult).not.toEqual(resultcoin);
            expect(newresult.icon).toEqual("https://lcw.nyc3.cdn.digitaloceanspaces.com/production/currencies/32/test.webp");
        })

        it('update body', async()=>{
            const mockCoin = {
                identifier: "TEST",
                display_name: "TestCoin",
                icon: "testurl",
                tags: ["TEST", "TestCoin"]
            }
            const otherCoin = {
                identifier: "SOME",
                display_name: "SomeCoin",
                icon: "https://lcw.nyc3.cdn.digitaloceanspaces.com/production/currencies/32/some.webp",
                tags: ["SOME", "SomeCoin"]
            }
            await Coin.create(mockCoin);
            let resultcoin = await Coin.findOne({identifier: "TEST"});
            await request(app).put(`/track/${resultcoin._id}`).send(otherCoin).expect(200);
            let newresult = await Coin.findOne({identifier: "SOME"});
            expect(resultcoin).toMatchObject(mockCoin);
            expect(newresult).not.toMatchObject(resultcoin);
            expect(newresult).toMatchObject(otherCoin)
        })
    })

    describe('DELETE', ()=>{
        it('successful delete', async ()=>{
            const mockCoin = {identifier: "TEST",
                display_name: "TestCoin",
                icon: "testurl",
                tags: ["TEST", "TestCoin"]
            }

            await Coin.create(mockCoin);

            const insertedCoin = await Coin.findOne({identifier: "TEST"});
            await request(app).delete(`/track/${insertedCoin._id}`).expect(200);
            const deleteCoin = await Coin.findOne({identifier: "TEST"});
            expect(deleteCoin).toBeNull();
        })

        it('return 404 when not exist', async ()=>{
            const mockID = "0123456789abcdef01234567"
            await request(app).delete(`/track/${mockID}`).expect(404);
        })
    })
});
