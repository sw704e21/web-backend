let express = require('express');
let router = express.Router();
let bodyParser = require('body-parser').json()
let spawn = require('child_process').spawn;
const script = 'C:\\Users\\Bruger\\PycharmProjects\\server-backend\\src\\'

router.post('/', bodyParser, function (req, res) {
    console.log( req.body)
    const ls = spawn('python', [script + 'add_to_queue.py', JSON.stringify(req.body)])
    ls.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
    });

    ls.stderr.on('data', (data) => {
        console.log(`stderr: ${data}`);
    });

    ls.on('close', (code) =>{
        console.log(`child proccess exited with code ${code}`)
    })
    res.statusCode = 200
    res.send()
})

module.exports = router;
