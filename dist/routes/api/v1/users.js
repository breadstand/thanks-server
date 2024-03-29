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
exports.userRoutes = void 0;
const express_1 = require("express");
const user_1 = require("../../../models/user");
const users_1 = require("../../../services/users");
exports.userRoutes = (0, express_1.Router)();
exports.userRoutes.get('/:id', (req, res) => {
    user_1.UserObject.findById(req.userId)
        .then(user => {
        if (user) {
            user.password = '';
        }
        res.json({
            success: true,
            data: user
        });
    }).catch(err => {
        console.log(err);
        res.status(500).send('Internal server error');
    });
});
exports.userRoutes.put('/:id', (req, res) => {
    let options = {
        returnDocument: 'after',
    };
    user_1.UserObject.findByIdAndUpdate(req.userId, req.body, {
        returnDocument: 'after'
    })
        .then(user => {
        if (user) {
            user.password = '';
        }
        res.json({
            success: true,
            data: user
        });
    })
        .catch(err => {
        console.log(err);
        res.status(500).send('Internal server error');
    });
});
exports.userRoutes.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield (0, users_1.deleteUser)(req.userId);
        res.json({
            success: true,
            error: ''
        });
    }
    catch (err) {
        console.log(err);
        res.status(500).send('Internal server error');
    }
}));
exports.userRoutes.post('/:id/add-contact', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let user = yield user_1.UserObject.findById(req.userId);
        if (!user) {
            throw "Invalid user";
        }
        user = yield (0, users_1.addContact)(user, req.body.contact, req.body.contactType);
        if (user) {
            console.log(user);
            user.password = '';
            res.json({
                success: true,
                data: user
            });
        }
        else {
            res.json({
                success: false,
                error: "Invalid user",
                data: null
            });
        }
    }
    catch (err) {
        console.log(err);
        res.status(500).send('Internal server error');
    }
}));
exports.userRoutes.put('/:id/verify-contact', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let user = yield user_1.UserObject.findById(req.userId);
        if (!user) {
            throw "Invalid user";
        }
        user = yield (0, users_1.verifyUserContact)(user, req.body.contact, req.body.contactType, req.body.code);
        if (user) {
            user.password = '';
            res.json({
                success: true,
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
exports.userRoutes.put('/:id/remove-contact', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('user/remove-contact');
        let user = yield user_1.UserObject.findById(req.userId);
        if (!user) {
            throw "Invalid user";
        }
        yield (0, users_1.removeContact)(user, req.body.contact, req.body.contactType);
        console.log(user);
        user.password = '';
        res.json({
            success: true,
            data: user
        });
    }
    catch (err) {
        console.log(err);
        res.status(500).send('Internal server error');
    }
}));
