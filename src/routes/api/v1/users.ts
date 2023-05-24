import { Router } from 'express'
import { User, UserObject } from '../../../models/user'
import { addContact, deleteUser, getStripeCustomerId, getUser, removeContact, verifyUserContact } from '../../../services/users'
import Stripe from 'stripe';
let stripeKey = process.env.STRIPE_PRIVATE_KEY
if (!stripeKey) {
    stripeKey = ''
}
const stripe = new Stripe(stripeKey, {
    apiVersion: '2022-11-15',
});

export var userRoutes = Router()

userRoutes.get('/:id', (req, res) => {
    UserObject.findById(req.userId)
        .then(user => {
            if (user) {
                user.password = ''
            }
            res.json({
                success: true,
                data: user
            })

        }).catch(err => {
            console.log(err)
            res.status(500).send('Internal server error')
        })
})

userRoutes.put('/:id', (req, res) => {
    let options = {
        returnDocument: 'after',
    }
    UserObject.findByIdAndUpdate(req.userId, req.body, {
        returnDocument: 'after'
    })
        .then(user => {
            if (user) {
                user.password = ''
            }
            res.json({
                success: true,
                data: user
            })
        })
        .catch(err => {
            console.log(err)
            res.status(500).send('Internal server error')
        })
})



userRoutes.delete('/:id', async (req, res) => {
    try {
        await deleteUser(req.userId)
        res.json({
            success: true,
            error: ''
        })
    } catch (err) {
        console.log(err)
        res.status(500).send('Internal server error')

    }
})


userRoutes.post('/:id/add-contact', async (req, res) => {
    try {
        let user: User | null = await UserObject.findById(req.userId)
        if (!user) {
            throw "Invalid user"
        }

        user = await addContact(user, req.body.contact,
            req.body.contactType)
        if (user) {
            console.log(user)
            user.password = ''
            res.json({
                success: true,
                data: user
            })
        } else {
            res.json({
                success: false,
                error: "Invalid user",
                data: null
            })
        }
    } catch (err) {
        console.log(err)
        res.status(500).send('Internal server error')
    }
})




userRoutes.put('/:id/verify-contact', async (req, res) => {
    try {
        let user: User | null = await UserObject.findById(req.userId)
        if (!user) {
            throw "Invalid user"
        }
        user = await verifyUserContact(user,
            req.body.contact,
            req.body.contactType,
            req.body.code)
        if (user) {
            user.password = ''
            res.json({
                success: true,
                data: user
            })
        } else {
            res.json({
                success: false,
                error: "Invalid code",
                data: null
            })
        }
    } catch (err) {
        console.log(err)
        res.status(500).send('Internal server error')
    }
})


userRoutes.put('/:id/remove-contact', async (req, res) => {
    try {
        console.log('user/remove-contact')
        let user: User | null = await UserObject.findById(req.userId)
        if (!user) {
            throw "Invalid user"
        }

        await removeContact(user, req.body.contact,
            req.body.contactType)
        console.log(user)
        user.password = ''
        res.json({
            success: true,
            data: user
        })
    } catch (err) {
        console.log(err)
        res.status(500).send('Internal server error')
    }
})

userRoutes.get('/:userid/payment_methods', async (req, res) => {
    try {
        let user = await getUser(req.userId)
        if (!user) {
            return res.status(404).send('User does not exist')
        }

        let stripeCustomerId = await getStripeCustomerId(user, req.userId)

        let results = await Promise.all([
            stripe.customers.retrieve(user.stripeCustomerId),
            stripe.paymentMethods.list({
                customer: user.stripeCustomerId,
                type: 'card',
            })
        ]);


        let customer = results[0] as Stripe.Customer;
        let defaultPaymentMethod = ''

        let paymentMethods: Stripe.ApiList<Stripe.PaymentMethod> = results[1];
        let numberOfPaymentMethods = paymentMethods.data.length
        if (customer.invoice_settings) {
            defaultPaymentMethod = customer.invoice_settings.default_payment_method as string;
        }


        return res.json({
            success: true,
            data: {
                paymentMethods: paymentMethods.data,
                defaultPaymentMethod: defaultPaymentMethod,
                numberOfPaymentMethods: numberOfPaymentMethods
            }
        });
    } catch (err) {
        console.log(err)
        res.status(500).send('Internal server error')
    }
});


userRoutes.get('/:userid/payment_methods/secret', async (req, res) => {
    try {
        let user = await getUser(req.userId)
        if (!user) {
            return res.status(404).send('User does not exist')
        }

        let stripeCustomerId = await getStripeCustomerId(user, req.userId)

        let setupIntent = await stripe.setupIntents.create({
            customer: stripeCustomerId,
            payment_method_types: ['card'],
        });

        res.json({
            client_secret: setupIntent.client_secret
        });

    } catch (err) {
        console.log(err)
        res.status(500).send('Internal server error')
    }


});



userRoutes.post('/:userid/payment_methods/:methodid/make_default', async (req,res) => {
    try {
        let user = await getUser(req.userId)
        if (!user) {
            return res.status(404).send('User does not exist')
        }

        let stripeCustomerId = await getStripeCustomerId(user, req.userId)

        let customer = await stripe.customers.update(stripeCustomerId,{
            invoice_settings: {
                default_payment_method: req.params.methodid
            }});

        let defaultPaymentMethod = ''
        if (customer.invoice_settings) {
            defaultPaymentMethod = customer.invoice_settings.default_payment_method as string;
        }

        
        res.json({
            success: true,
            data: {
                defaultPaymentMethod: defaultPaymentMethod,
            } 
        })

    } catch (err) {
        console.log(err)
        res.status(500).send('Internal server error')
    }
});


userRoutes.delete('/:userid/payment_methods/:methodid',async (req,res) => {
    try {
        let user = await getUser(req.userId)
        if (!user) {
            return res.status(404).send('User does not exist')
        }
        let stripeCustomerId = await getStripeCustomerId(user, req.userId)
        
        let paymentMethod = await stripe.paymentMethods.retrieve(req.params.methodid)

        if (paymentMethod.customer != stripeCustomerId) {
            return res.status(401).send('User does not own this method')
        }

        await stripe.paymentMethods.detach(req.params.methodid);
        
        let results = await Promise.all([
            stripe.customers.retrieve(user.stripeCustomerId),
            stripe.paymentMethods.list({
                customer: user.stripeCustomerId,
                type: 'card',
            })
        ]);


        let customer = results[0] as Stripe.Customer;
        console.log(customer)
        let defaultPaymentMethod = ''

        let paymentMethods: Stripe.ApiList<Stripe.PaymentMethod> = results[1];

        let numberOfPaymentMethods = paymentMethods.data.length
        if (customer.invoice_settings) {
            defaultPaymentMethod = customer.invoice_settings.default_payment_method as string;
        }


        return res.json({
            success: true,
            data: {
                paymentMethods: paymentMethods.data,
                defaultPaymentMethod: defaultPaymentMethod,
                numberOfPaymentMethods: numberOfPaymentMethods
            }
        });

        
    } catch (err) {
        console.log(err)
        res.status(500).send('Internal server error')
    }
});

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