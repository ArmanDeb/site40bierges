const toolbox = require("../self_modules/toolbox");
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const data = require("../data.json");
const _ = require("lodash")
const fs = require('fs');
const path = require('path');
let blogMessages = [];

const LOG_FILE = path.join(__dirname, '..', 'forensic.log');

function logEvent(eventData) {
    const entry = JSON.stringify({ timestamp: new Date().toISOString(), ...eventData }) + '\n';
    fs.appendFileSync(LOG_FILE, entry, 'utf-8');
}

exports.connectUser = (req, res) => {
    let body = req.body
    let user = null
    if (!toolbox.checkMail(body.mail)) {
        res.status(400).send('The mail doesn\'t use a correct format');
    } else {
        data.forEach(el => {
            if(el.mail === body.mail) {
                user = el
            }
        });
        if(user == null){
            logEvent({ event: 'AUTH_ATTEMPT', mail: body.mail, status: 'USER_NOT_FOUND', userProfile: null });
            res.status(404).send('This user does not exist');
        } else {
            bcrypt.compare(body.password, user.password, function (error, result) {
                if (error) {
                    res.status(500).send(error + '. Please contact the webmaster')
                } else if (result) {
                    logEvent({ event: 'AUTH_ATTEMPT', mail: body.mail, status: 'SUCCESS', userProfile: { ...user } });
                    const token = jwt.sign({ user_id: user.id, user_role: user.role }, process.env.ACCESS_TOKEN_SECRET);
                    res.status(200).json({ token, role: user.role })
                } else {
                    logEvent({ event: 'AUTH_ATTEMPT', mail: body.mail, status: 'INVALID_PASSWORD', userProfile: { ...user } });
                    res.status(403).send('Invalid authentication')
                }
            });
        }
    }
}

exports.fetchDataUser = (req, res) => {
    let usr = null
    data.forEach(el => {
        if(el.id === req.body.user_id){
            usr = _.cloneDeep(el)
        }
    });
    if(usr == null) {
        res.status(500).send('Wrong cookies data. Please contact the webmaster')
    } else {
        delete usr.password
        res.status(200).json(usr);
    }
}

exports.getVictory = (req, res) => {
    let usr;
    let usrList = [];
    data.forEach(el => {
        usr = _.cloneDeep(el)
        delete usr.password
        usrList.push(usr)
    });
    res.status(200).json(usrList);
}

exports.getForensicLogs = (req, res) => {
    if (!fs.existsSync(LOG_FILE)) {
        return res.status(200).json([]);
    }
    const content = fs.readFileSync(LOG_FILE, 'utf-8');
    const logs = content.trim().split('\n').filter(l => l).map(l => JSON.parse(l));
    res.status(200).json(logs);
}

exports.fetchBlogMessages = (req, res) => {
    res.status(200).json(blogMessages);
}

exports.createBlogmessage = (req, res) => {
    let body = req.body
    if(body.message === null || body.message === "") {
        res.status(400).send('Cannot add an empty message');
    } else {
        blogMessages.push(body.message)
        res.status(200).send("Message Added");
    }
}