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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRoutes = void 0;
const express_1 = require("express");
const user_1 = require("../../../models/user");
const users_1 = require("../../../services/users");
const stripe_1 = __importDefault(require("stripe"));
let stripeKey = process.env.STRIPE_PRIVATE_KEY;
if (!stripeKey) {
    stripeKey = '';
}
const stripe = new stripe_1.default(stripeKey, {
    apiVersion: '2022-11-15',
});
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
exports.userRoutes.get('/:userid/payment_methods', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let user = yield (0, users_1.getUser)(req.userId);
        if (!user) {
            return res.status(404).send('User does not exist');
        }
        let stripeCustomerId = yield (0, users_1.getStripeCustomerId)(user, req.userId);
        let results = yield Promise.all([
            stripe.customers.retrieve(user.stripeCustomerId),
            stripe.paymentMethods.list({
                customer: user.stripeCustomerId,
                type: 'card',
            })
        ]);
        let customer = results[0];
        let defaultPaymentMethod = '';
        let paymentMethods = results[1];
        let numberOfPaymentMethods = paymentMethods.data.length;
        if (customer.invoice_settings) {
            defaultPaymentMethod = customer.invoice_settings.default_payment_method;
        }
        return res.json({
            success: true,
            data: {
                paymentMethods: paymentMethods,
                defaultPaymentMethod: defaultPaymentMethod,
                numberOfPaymentMethods: numberOfPaymentMethods
            }
        });
    }
    catch (err) {
        console.log(err);
        res.status(500).send('Internal server error');
    }
}));
exports.userRoutes.get('/:userid/payment_methods/secret', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let user = yield (0, users_1.getUser)(req.userId);
        if (!user) {
            return res.status(404).send('User does not exist');
        }
        let stripeCustomerId = yield (0, users_1.getStripeCustomerId)(user, req.userId);
        let setupIntent = yield stripe.setupIntents.create({
            customer: stripeCustomerId,
            payment_method_types: ['card'],
        });
        res.json({
            client_secret: setupIntent.client_secret
        });
    }
    catch (err) {
        console.log(err);
        res.status(500).send('Internal server error');
    }
}));
/*
userRoutes.get('/:userid/paymentmethods/add',
    security.allowUserOnly,async(req,res) => {
    try {
        return utils.renderPage(req,res,'users/paymentmethods/add.pug',{
            userBeingViewed: req.userBeingViewed
        });
    } catch (e) {
        return utils.goToErrorPage(req,res,e);
    }

});

userRoutes.post('/:userid/paymentmethods/add',
    security.allowUserOnly,async (req,res) => {
    try {
        let stripeCustomerId = await users.getStripeCustomerId(req.userBeingViewed);
        let paymentMethod = await stripe.paymentMethods.attach(req.body.paymentMethod,
            {customer: stripeCustomerId});
        let customer = await stripe.customers.update(stripeCustomerId,{
            invoice_settings: {
                default_payment_method: paymentMethod.id
            }
        });
        return res.redirect(`/users/${req.params.userid}/paymentmethods`);
    } catch(e) {
        return utils.goToErrorPage(req,res,e);
    }
});


userRoutes.get('/:userid/paymentmethods/add-bank-account',
    security.allowUserOnly,async(req,res) => {
    try {
        
        let errors = [];
        if (req.session.errors) {
            errors = req.session.errors;
            delete req.session.errors;
        }
        let formValues = {};
        if (req.session.formValues) {
            formValues = req.session.formValues;
            delete req.session.formValues;
        }

        return utils.renderPage(req,res,'users/paymentmethods/add-bank-account.pug',{
            formValues: formValues,
            errors: errors
        });
    } catch (e) {
        return utils.goToErrorPage(req,res,e);
    }

});

userRoutes.post('/:userid/paymentmethods/add-bank-account',
    security.allowUserOnly,async (req,res) => {
    try {
        let stripeCustomerId = await users.getStripeCustomerId(req.userBeingViewed);
        //console.log(req.body);
        let result = await stripe.customers.createSource(stripeCustomerId,
            {
                source: {
                    object: 'bank_account',
                    country: 'US',
                    currency: 'usd',
                    account_holder_name: req.body.account_holder_name,
                    account_holder_type: req.body.account_holder_type,
                    routing_number: req.body.routing_number,
                    account_number: req.body.account_number
                }
            }
          );
        return res.redirect(`/users/${req.params.userid}/paymentmethods`);
    } catch(e) {
        if (e.type == 'StripeInvalidRequestError') {
            req.session.errors = [{msg: e.raw.message}];
            req.session.formValues = req.body;
            return res.redirect(`/users/${req.params.userid}/paymentmethods/add-bank-account`);
        }
        return utils.goToErrorPage(req,res,e);
    }
});

userRoutes.post('/:userid/paymentmethods/:paymentmethodid/delete',
    security.allowUserOnly,async (req,res) => {
    try {
        await stripe.paymentMethods.detach(req.params.paymentmethodid);
        return res.redirect(`/users/${req.params.userid}/paymentmethods`);
    } catch (e) {
        return utils.goToErrorPage(req,res,e);
    }
});

userRoutes.post('/:userid/paymentmethods/:paymentmethodid/delete-bank-account',
    security.allowUserOnly,async (req,res) => {
    try {
        await stripe.customers.deleteSource(
            req.userBeingViewed.stripeCustomerId,
            req.params.paymentmethodid);
        return res.redirect(`/users/${req.params.userid}/paymentmethods`);
    } catch (e) {
        return utils.goToErrorPage(req,res,e);
    }
});


userRoutes.post('/:userid/paymentmethods/:paymentmethodid/make-default',
    security.allowUserOnly,async (req,res) => {
    try {
        let customer = await stripe.customers.update(req.userBeingViewed.stripeCustomerId,{
            invoice_settings: {
                default_payment_method: req.params.paymentmethodid
            }});
        return res.redirect(`/users/${req.params.userid}/paymentmethods`);
    } catch (e) {
        return utils.goToErrorPage(req,res,e);
    }
});


userRoutes.post('/:userid/paymentmethods/:paymentmethodid/make-default-bank-account',
    security.allowUserOnly,async (req,res) => {
    try {
        let customer = await stripe.customers.update(req.userBeingViewed.stripeCustomerId,{
            default_source: req.params.paymentmethodi,
            invoice_settings: {
                default_payment_method: null
            }});
        return res.redirect(`/users/${req.params.userid}/paymentmethods`);
    } catch (e) {
        return utils.goToErrorPage(req,res,e);
    }
});


userRoutes.get('/:userid/paymentmethods/:paymentmethodid/verify-bank-account',
    security.allowUserOnly,async(req,res) => {
    try {
        let errors = [];
        if (req.session.errors) {
            errors = req.session.errors;
            delete req.session.errors;
        }

        return utils.renderPage(req,res,'users/paymentmethods/verify-bank-account.pug',{
            paymentMethodId: req.params.paymentmethodid,
            errors: errors
        });
    } catch (e) {
        return utils.goToErrorPage(req,res,e);
    }

});

userRoutes.post('/:userid/paymentmethods/:paymentmethodid/verify-bank-account',
    security.allowUserOnly,async (req,res) => {
    try {
        let stripeCustomerId = await users.getStripeCustomerId(req.userBeingViewed);
        //console.log(req.body);

        amount1 = parseInt(req.body.amount1);
        amount2 = parseInt(req.body.amount2);
        let result = await stripe.customers.verifySource(
            stripeCustomerId,
            req.params.paymentmethodid,
            { amounts: [amount1, amount2]});

        return res.redirect(`/users/${req.params.userid}/paymentmethods`);
    } catch(e) {
        if (e.type == 'StripeInvalidRequestError') {
            req.session.errors = [{msg: e.raw.message}];
            return res.redirect(`/users/${req.params.userid}/paymentmethods/${req.params.paymentmethodid}/verify-bank-account`);
        }
        
        return utils.goToErrorPage(req,res,e);
    }
});
*/ 
