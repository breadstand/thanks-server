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
exports.removeBounty = exports.approveBounty = void 0;
const post_1 = require("../models/post");
const teams_1 = require("./teams");
function approveBounty(postid) {
    return __awaiter(this, void 0, void 0, function* () {
        let post = yield post_1.PostObject.findById(postid).populate('bounty');
        if (!post) {
            return;
        }
        post.approved = true;
        yield post.save();
        let bounty = post.bounty;
        let subject = 'Bounty Approved: ' + post.idea;
        let message = 'Your idea was approved for a bounty.\n' +
            'Idea: ' + post.idea +
            'Bounty: ' + bounty.name +
            'Amount: ' + bounty.amount;
        if (!post.createdBy) {
            return post;
        }
        (0, teams_1.notifyMember)(post.createdBy, subject, message);
        return post;
    });
}
exports.approveBounty = approveBounty;
;
function removeBounty(postid) {
    return __awaiter(this, void 0, void 0, function* () {
        let post = yield post_1.PostObject.findById(postid).populate('bounty');
        if (!post) {
            return;
        }
        post.approved = false;
        yield post.save();
        return post;
    });
}
exports.removeBounty = removeBounty;
