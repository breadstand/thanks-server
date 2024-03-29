import { NextFunction, Request, Response, Router } from "express"
import { TeamPrize, TeamPrizeObject } from "../../../models/team"
import { User } from "../../../models/user"
import { availablePrizes, createPrize, createTeam, deactivePrize, deleteTeam, getMemberByUserId, getStripeCustomerId, getStripeSubscriptionId, getTeam, getUsersMemberships, notifyTeam, updateTeam, getMemberships } from "../../../services/teams"
import { figureOutDateRange, pickTeamWinners, pickWinners } from "../../../services/posts"
import { getUser } from "../../../services/users"
import { ThanksSetObject } from "../../../models/post"
import { Bounty, BountyObject, BountyUpdate } from "../../../models/bounty"
import { truncateSync } from "fs"
const Types = require('mongoose').Types

import Stripe from 'stripe';
let stripeKey = process.env.STRIPE_PRIVATE_KEY
if (!stripeKey) {
    stripeKey = ''
}
const stripe = new Stripe(stripeKey, {
    apiVersion: '2022-11-15',
});

export var teamRoutes = Router()

async function allowTeamOwnersOnly(req: Request, res: Response, next: NextFunction) {
    let teamid = new Types.ObjectId(req.params.id)
    req.team = await getTeam(teamid)
    if (!req.team) {
        return res.status(404).send('Team does not exist')
    }

    // Only team members can see the sets
    req.usersMembership = await getMemberByUserId(teamid, req.userId)
    if (!req.usersMembership?.owner) {
        return res.status(401).send('You are not an owner of this team.')
    }

    next()
}



teamRoutes.get('/:teamid', async (req, res) => {
    try {
        let teamid = new Types.ObjectId(req.params.teamid)
        let member = await getMemberByUserId(teamid, req.userId)

        if (!member?.owner) {
            return res.status(401).send("Unauthorized: You are not an owner of this team.")
        }

        let team = await getTeam(teamid)
        res.json({
            success: true,
            error: '',
            data: team
        })

    } catch (err) {
        console.log(err)
        res.status(500).send('Internal server error')
    }

})



teamRoutes.post('/', async (req, res) => {
    try {
        let user = await getUser(req.userId)
        if (!user) {
            return res.json({
                success: false,
                error: "It looks like you don't exist?",
                data: {}
            })
        }

        var usersteams = await getUsersMemberships(user._id);
        if (usersteams.length >= 50) {
            return res.json({
                success: false,
                error: 'You appear to be on too many teams.',
                data: {}
            })
        }

        let results = await createTeam(user as User)
        let team = results[0]

        res.json({
            success: true,
            data: team
        })
    } catch (err) {
        console.log(err)
        res.status(500).send('Internal server error')
    }
})


teamRoutes.put('/:teamid', async (req, res) => {
    try {
        let teamid = new Types.ObjectId(req.params.teamid)
        let member = await getMemberByUserId(teamid, req.userId)
        let update = req.body

        if (!member?.owner) {
            return res.status(401).send("Unauthorized: You are not an owner of this team.")
        }

        let team = await updateTeam(teamid, update)
        res.json({
            success: true,
            error: '',
            data: team
        })

    } catch (err) {
        console.log(err)
        res.status(500).send('Internal server error')
    }

})



teamRoutes.delete('/:teamid', async (req, res) => {
    try {
        let teamid = new Types.ObjectId(req.params.teamid)
        let member = await getMemberByUserId(teamid, req.userId)

        if (!member?.owner) {
            return res.status(401).send("Unauthorized: You are not an owner of this team.")
        }

        let team = await deleteTeam(teamid)
        res.json({
            success: true,
            error: ''
        })

    } catch (err) {
        console.log(err)
        res.status(500).send('Internal server error')
    }

})



teamRoutes.get('/:id/prizes', async (req, res) => {
    try {
        let teamid = new Types.ObjectId(req.params.id)

        // Only team members can see the prizes
        let usersMembership = await getMemberByUserId(teamid, req.userId)
        if (!usersMembership) {
            return res.json({
                success: false,
                error: "Unauthorized: You are not a member of this team.",
                data: []
            })
        }


        let prizes = await availablePrizes(teamid)
        res.json({
            success: true,
            error: '',
            data: prizes
        })
    } catch (err) {
        console.log(err)
        res.status(500).send('Internal server error')
    }
})



teamRoutes.post('/:teamid/prizes', async (req, res) => {
    try {
        let teamid = new Types.ObjectId(req.params.teamid)
        let prize: TeamPrize = req.body
        let missingFields: string[] = []
        if (!prize.team) { missingFields.push('team') }
        if (!prize.createdBy) { missingFields.push('createdBy') }
        if (!prize.name) { missingFields.push('name') }

        if (missingFields.length) {
            return res.json({
                success: false,
                error: 'Missing fields: ' + missingFields.join(', '),
                data: prize
            })
        }

        if (String(prize.team) != String(teamid)) {
            return res.json({
                success: false,
                error: `Team: ${prize.team} does not match url team: ${teamid}`,
                data: prize
            })
        }

        let usersMembership = await getMemberByUserId(teamid, req.userId)
        if (!usersMembership?.owner) {
            return res.json({
                success: false,
                error: 'You are not a team owner',
                data: prize
            })
        }

        let savedPrize = await createPrize(prize)
        res.json({
            success: true,
            error: '',
            data: savedPrize
        })

    } catch (err) {
        console.log(err)
        res.status(500).send('Internal server error')
    }
})

teamRoutes.post('/:teamid/pick-winners', async (req, res) => {
    try {
        let dryRun = true
        if (!req.body.dryRun) {
            dryRun = false
        }
        console.log('dryRun', dryRun)
        let teamid = new Types.ObjectId(req.params.teamid)
        // Check the user is a team owner

        let usersMembership = await getMemberByUserId(teamid, req.userId)
        if (!usersMembership?.owner) {
            return res.status(401).send("Unauthorized: You are not a team owner")
        }

        let results = await pickTeamWinners(teamid, 0, dryRun)
        res.json({
            success: true,
            error: '',
            data: results
        })
    } catch (err) {
        console.log(err)
        res.status(500).send('Internal server error')
    }
})


teamRoutes.put('/:teamid/prizes/:prizeid', async (req, res) => {
    try {
        let teamid = new Types.ObjectId(req.params.teamid)
        let prizeid = new Types.ObjectId(req.params.prizeid)

        let usersMembership = await getMemberByUserId(teamid, req.userId)
        if (!usersMembership?.owner) {
            return res.status(401).send("Unauthorized: You are not a team owner")
        }

        let prize = await TeamPrizeObject.findById(prizeid)
        if (!prize) {
            return res.status(404).send("Cannot find that prize")
        }

        if (String(prize.team) != String(teamid)) {
            return res.status(401).send("Unauthorized: prize belongs to a different team")
        }

        let update = req.body
        if (req.body.hasOwnProperty('name')) {
            update.name = req.body.name
        }
        if (req.body.hasOwnProperty('description')) {
            update.description = req.body.description
        }
        if (req.body.hasOwnProperty('image')) {
            update.image = req.body.image
        }
        if (req.body.hasOwnProperty('url')) {
            update.url = req.body.url
        }
        if (req.body.hasOwnProperty('imageHeight')) {
            update.imageHeight = req.body.imageHeight
        }
        if (req.body.hasOwnProperty('imageWidth')) {
            update.imageWidth = req.body.imageWidth
        }
        let updatedPrize = await TeamPrizeObject.findByIdAndUpdate(prizeid, { $set: update }, { new: true })
        res.json({
            success: true,
            error: '',
            data: updatedPrize
        })


    } catch (err) {
        console.log(err)
        res.status(500).send('Internal server error')
    }
})


teamRoutes.delete('/:teamid/prizes/:prizeid', async (req, res) => {
    try {
        let teamid = new Types.ObjectId(req.params.teamid)
        let prizeid = new Types.ObjectId(req.params.prizeid)

        let usersMembership = await getMemberByUserId(teamid, req.userId)
        if (!usersMembership?.owner) {
            return res.status(401).send("Unauthorized: You are not a team owner")
        }

        await deactivePrize(prizeid)
        res.json({
            success: true,
            error: '',
            data: {}
        })

    } catch (err) {
        console.log(err)
        res.status(500).send('Internal server error')
    }
})



teamRoutes.get('/:id/bounties', async (req, res) => {
    try {
        let teamid = new Types.ObjectId(req.params.id)

        // Only team members can see the prizes
        let usersMembership = await getMemberByUserId(teamid, req.userId)
        if (!usersMembership) {
            return res.status(401).send("Unauthorized: You are not a member of this team.")
        }
        let bounties = await BountyObject.find({ team: teamid, active: true })
            .populate('createdBy')
            .populate({
                path: 'ideas',
                populate: {
                    path: 'createdBy',
                    model: 'membership'
                }
            })
            .sort({ name: 1 })
        res.json({
            success: true,
            error: '',
            data: bounties
        })
    } catch (err) {
        console.log(err)
        res.status(500).send('Internal server error')
    }
})


teamRoutes.post('/:teamid/bounties', async (req, res) => {
    try {
        let teamid = new Types.ObjectId(req.params.teamid)
        let bounty = new BountyObject(req.body)
        let missingFields: string[] = []
        if (!bounty.team) { missingFields.push('team') }
        if (!bounty.createdBy) { missingFields.push('createdBy') }
        if (!bounty.name) { missingFields.push('name') }

        if (missingFields.length) {
            return res.json({
                success: false,
                error: 'Missing fields: ' + missingFields.join(', '),
                data: bounty
            })
        }

        if (String(bounty.team) != String(teamid)) {
            return res.status(401).send("Unauthorized: Bounty posted to the wrong URL")
        }

        let usersMembership = await getMemberByUserId(teamid, req.userId)
        if (!usersMembership?.owner) {
            return res.status(401).send("Unauthorized: You are not a team owner")
        }

        bounty.createdBy = usersMembership._id

        await bounty.save()
        res.json({
            success: true,
            error: '',
            data: bounty
        })

        let subject = 'New Bounty'
        let body = `${usersMembership.name} created a new bounty called: ${bounty.name}.`
        body += ` ${bounty.description}`
        if (bounty.reward) {
            body += ` Reward: ${bounty.reward}`
        }
        body += ` Do you have any ideas? .https://thanks.breadstand.us.`
        notifyTeam(teamid, subject, body)

    } catch (err) {
        console.log(err)
        res.status(500).send('Internal server error')
    }
})



teamRoutes.put('/:teamid/bounties/:bountyid', async (req, res) => {
    try {
        let teamid = new Types.ObjectId(req.params.teamid)
        let bountyid = new Types.ObjectId(req.params.bountyid)
        let update: BountyUpdate = req.body

        let usersMembership = await getMemberByUserId(teamid, req.userId)
        if (!usersMembership?.owner) {
            return res.status(401).send("Unauthorized: You are not a team owner")
        }

        let bounty = await BountyObject.findById(bountyid)
        if (!bounty) {
            return res.status(404).send("Cannot find that bounty")
        }

        if (String(bounty.team) != String(teamid)) {
            return res.status(401).send("Unauthorized: Bounty posted to the wrong URL")
        }

        let updatedBounty = await BountyObject.findByIdAndUpdate(bountyid, { $set: update }, { new: true })
        res.json({
            success: true,
            error: '',
            data: updatedBounty
        })


    } catch (err) {
        console.log(err)
        res.status(500).send('Internal server error')
    }
})


teamRoutes.put('/:teamid/bounties/:bountyid/remindMembers', async (req, res) => {
    try {
        let teamid = new Types.ObjectId(req.params.teamid)
        let bountyid = new Types.ObjectId(req.params.bountyid)

        let usersMembership = await getMemberByUserId(teamid, req.userId)
        if (!usersMembership?.owner) {
            return res.status(401).send("Unauthorized: You are not a team owner")
        }

        let bounty = await BountyObject.findById(bountyid)
        if (!bounty) {
            return res.status(404).send("No such bounty")
        }

        if (String(bounty.team) != String(teamid)) {
            return res.status(401).send("Unauthorized: Bounty does not belong to team")
        }
        let subject = 'Bounty Reminder!'
        let body = `${usersMembership.name} is looking for ideas for: ${bounty.name}.`
        if (bounty.reward) {
            body += ` Reward: ${bounty.reward}`
        }
        body += ` Do you have any? Go to https://thanks.breadstand.us/ to submit some ideas.`

        notifyTeam(teamid, subject, body)

        res.json({
            success: true,
            error: ''
        })

    } catch (err) {
        console.log(err)
        res.status(500).send('Internal server error')
    }
})




teamRoutes.get('/:id/sets', async (req, res) => {
    try {
        let teamid = new Types.ObjectId(req.params.id)

        // Only team members can see the sets
        let usersMembership = await getMemberByUserId(teamid, req.userId)
        if (!usersMembership) {
            return res.status(401).send('You are not a member of this team.')
        }

        let sets = await ThanksSetObject.find({ team: teamid })
        res.json({
            success: true,
            error: '',
            data: sets
        })
    } catch (err) {
        console.log(err)
        res.status(500).send('Internal server error')
    }
})


teamRoutes.get('/:id/getNextSet', async (req, res) => {
    try {
        let teamid = new Types.ObjectId(req.params.id)

        // Only team members can see the sets
        let usersMembership = await getMemberByUserId(teamid, req.userId)
        if (!usersMembership?.owner) {
            return res.status(401).send('You are not an owner of this team.')
        }

        let team = await getTeam(teamid)
        if (!team) {
            return res.status(404).send('Team not found')
        }
        let dateRange = await figureOutDateRange(team)

        let sets = await ThanksSetObject.find({ team: teamid })
        res.json({
            success: true,
            error: '',
            data: [
                {
                    _id: '',
                    created: new Date(),
                    team: teamid,
                    startDate: dateRange.start,
                    endDate: dateRange.end
                }
            ]
        })
    } catch (err) {
        console.log(err)
        res.status(500).send('Internal server error')
    }
})


teamRoutes.get('/:id/testPickingWinners', async (req, res) => {
    try {
        let teamid = new Types.ObjectId(req.params.id)

        // Only team members can see the sets
        let usersMembership = await getMemberByUserId(teamid, req.userId)
        if (!usersMembership?.owner) {
            return res.status(401).send('You are not an owner of this team.')
        }

        let team = await getTeam(teamid)
        if (!team) {
            return res.status(404).send('Team not found')
        }
        let dateRange = await figureOutDateRange(team)


        res.json({
            success: true,
            error: '',
            data: [
                {
                    _id: '',
                    created: new Date(),
                    team: teamid,
                    startDate: dateRange.start,
                    endDate: dateRange.end
                }
            ]
        })
    } catch (err) {
        console.log(err)
        res.status(500).send('Internal server error')
    }
})



teamRoutes.get('/:id/payment_methods', allowTeamOwnersOnly, async (req, res) => {
    try {
        let stripeCustomerId = await getStripeCustomerId(req.team)

        let results = await Promise.all([
            stripe.customers.retrieve(req.team.stripeCustomerId),
            stripe.paymentMethods.list({
                customer: req.team.stripeCustomerId,
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

        // If only one payment mehtod, set it as the default
        if (numberOfPaymentMethods == 1) {
            defaultPaymentMethod = paymentMethods.data[0].id
            await stripe.customers.update(req.team.stripeCustomerId, {
                invoice_settings: {
                    default_payment_method: defaultPaymentMethod
                }
            });

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


teamRoutes.get('/:id/payment_methods/secret', allowTeamOwnersOnly, async (req, res) => {
    try {

        let setupIntent = await stripe.setupIntents.create({
            customer: req.team.stripeCustomerId,
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



teamRoutes.post('/:id/payment_methods/:methodid/make_default', allowTeamOwnersOnly, async (req, res) => {
    try {
        let customer = await stripe.customers.update(req.team.stripeCustomerId, {
            invoice_settings: {
                default_payment_method: req.params.methodid
            }
        });

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


teamRoutes.delete('/:id/payment_methods/:methodid', allowTeamOwnersOnly, async (req, res) => {
    try {
        let paymentMethod = await stripe.paymentMethods.retrieve(req.params.methodid)

        if (paymentMethod.customer != req.team.stripeCustomerId) {
            return res.status(401).send('User does not own this method')
        }

        await stripe.paymentMethods.detach(req.params.methodid);

        let results = await Promise.all([
            stripe.customers.retrieve(req.team.stripeCustomerId),
            stripe.paymentMethods.list({
                customer: req.team.stripeCustomerId,
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


teamRoutes.put('/:id/price', allowTeamOwnersOnly, async (req, res) => {
    try {
        let pricingPlans = [process.env.STRIPE_DEFAULT_PLAN, process.env.STRIPE_PAID_PLAN]
        let newPrice = req.body.price
        // Make sure plan is a valid plan
        if (!pricingPlans.includes(newPrice)) {
            return res.status(401).send("Invalid pricing plan")
        }


        let subscriptionId = await getStripeSubscriptionId(req.team) as string
        console.log(subscriptionId)
        let subscription = await stripe.subscriptions.retrieve(subscriptionId)


        let memberships = await getMemberships(req.team.id)
        let quantity = memberships.length

        if (subscription.items.data.length > 0) {
            let currentItem = subscription.items.data[0].id
            let currentPrice = subscription.items.data[0].plan.id
            if (currentPrice == newPrice) {
                return res.json({
                    success: true,
                    data: newPrice
                });
            }
            let result = await stripe.subscriptions.update(
                subscriptionId,
                {items: [{ price: newPrice, quantity: quantity },{id: currentItem,deleted: true}]}
                )
            req.team.pricingPlan = newPrice
            req.team.save()
            console.log(req.team)
            return res.json({
                success: true,
                data: newPrice
            });
        } else {
            await stripe.subscriptions.update(
                subscriptionId,
                {items: [{ price: newPrice,quantity: quantity }]}
                )
            req.team.pricingPlan = newPrice
            req.team.save()
    
            return res.json({
                success: true,
                data: newPrice
            });
        }

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