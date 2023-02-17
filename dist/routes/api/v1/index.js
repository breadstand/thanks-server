"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiRootRoutes = void 0;
const crypto_1 = require("crypto");
const express_1 = require("express");
const user_1 = require("../../../models/user");
const teams_1 = require("../../../services/teams");
const users_1 = require("../../../services/users");
const jwt = require('jsonwebtoken');
exports.apiRootRoutes = (0, express_1.Router)();
exports.apiRootRoutes.get('/', (req, res) => {
    res.send('From API routes');
});
exports.apiRootRoutes.post('/register', (req, res) => {
    // Don't allow creating if the user already exists
    let userData = req.body;
    let user = new user_1.UserObject(userData);
    user.password = (0, crypto_1.createHash)('sha256')
        .update(user.password)
        .digest('hex');
    user.save((error, registeredUser) => {
        if (error) {
            console.log(error);
        }
        else {
            console.log(registeredUser);
            let payload = { subject: registeredUser._id };
            let token = jwt.sign(payload, process.env.JWOTKEY);
            registeredUser.password = '';
            res.status(200).send({
                token: token,
                user: registeredUser
            });
        }
    });
});
exports.apiRootRoutes.post('/login', (req, res) => {
    let userData = req.body;
    userData.password = (0, crypto_1.createHash)('sha256')
        .update(userData.password)
        .digest('hex');
    user_1.UserObject.findOne({ email: userData.email }, (error, user) => {
        if (error) {
            console.log(error);
        }
        else {
            if (!user) {
                res.status(401).send('Invalid email');
            }
            else if (user.password !== userData.password) {
                res.status(401).send('Invalid password');
            }
            else {
                let payload = { subject: user._id };
                let token = jwt.sign(payload, process.env.JWOTKEY);
                user.password = '';
                res.status(200).send({
                    token: token,
                    user: user
                });
            }
        }
    });
});
exports.apiRootRoutes.post('/send-code', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let user = yield (0, users_1.sendCodeToVerifyContact)(req.body.contact, req.body.contactType);
        console.log(user === null || user === void 0 ? void 0 : user.contacts);
        res.json({
            success: true
        });
    }
    catch (err) {
        console.log(err);
        res.status(500).send('Internal server error');
    }
}));
exports.apiRootRoutes.post('/verify-code', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let user = yield (0, users_1.verifyCode)(req.body.contact, req.body.contactType, req.body.code);
        if (user) {
            yield (0, teams_1.assignUserToMembersByContact)(req.body.contact, req.body.contactType, user._id);
            let payload = { subject: user._id };
            user.password = '';
            res.json({
                success: true,
                token: jwt.sign(payload, process.env.JWOTKEY),
                data: user
            });
        }
        else {
            res.json({
                success: false,
                error: "Invalid code",
                data: null
            });
        }
    }
    catch (err) {
        console.log(err);
        res.status(500).send('Internal server error');
    }
}));
