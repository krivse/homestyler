import express from "express";
import {validate_json} from './validate.js';
import {p_homestyler} from './homestyler.js';
import logger from '././logger.js';


let app = express();
app.use(express.json())
app.listen(8888, function(){
    console.log('Express server listening on port 127.0.0.1:8888');
});


app.get('/api', async function (req, res) {
    let validate_data = validate_json(req.body)
    if (validate_data[0] == 400) {
        res.status(400).send(validate_data[1])
    } else {
        logger.info(`log:: num: ${validate_data[1]}, name: ${validate_data[2]}`)
        let answer = await p_homestyler(validate_data[1], validate_data[2])
        if (answer[0] == 200) {
          res.status(200).sendFile(answer[2])
          fs.unlink(answer[2], () => {})
        } else {
            res.status(400).send(answer[1])
        }
    }
})
