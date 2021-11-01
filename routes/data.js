let express = require('express');
let router = express.Router();
let app = require('../app');
let cors = require('cors');
let Sentiment = require('../models/Sentiment');


let spawn = require('child_process').spawn;
//const script = 'C:\\Users\\Bruger\\PycharmProjects\\server-backend\\src\\'

router.post('/', cors(app.corsOptions), async function (req, res, next) {
    const body = req.body;
    console.log(body)
    let q = Sentiment.Sentiment.find({url: body['url']});
    await q.exec(function (err, result) {
        if(err){
            next(err);
        }
        else{
            console.log(result);
            if(result.length > 0){
                res.status(403);
                res.send("Post with url already in the system: " + body['url']);
            }
            else{
                const ls = spawn('python3', [app.serverPath + 'src/add_to_queue.py', JSON.stringify(body)]);
                ls.stdout.on('data', (data) => {
                    console.log(`stdout: ${data}`);
                });

                ls.stderr.on('data', (data) => {
                    console.log(`stderr: ${data}`);
                });

                ls.on('close', (code) => {
                    console.log(`child proccess exited with code ${code}`);
                })
                res.status(200);
                res.send();
            }
        }
    });

})

module.exports = router;
