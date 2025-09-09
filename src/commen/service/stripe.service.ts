import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Request } from "express";
import Stripe from "stripe";

@Injectable()
export class StripeService {
    private stripe: Stripe
    constructor() {
        this.stripe = new Stripe(process.env.STRIPE_SECRET as string)
    }
    async cheakoutSession({
        customer_email,
        mode = "payment",
        cancel_url = process.env.CANCEL_URL,
        success_url = process.env.SUCCESS_URL,
        metadata,
        line_items,
        discounts = []

    }: Stripe.Checkout.SessionCreateParams) {
        let session = await this.stripe.checkout.sessions.create({
            customer_email,
            mode,
            cancel_url,
            success_url,
            metadata,
            line_items,
            discounts

        })
        return session
    }
    async createCoupon(params: Stripe.CouponCreateParams): Promise<Stripe.Response<Stripe.Coupon>> {
        const coupon = await this.stripe.coupons.create(params)
        return coupon
    }
    async createPaymentIntent(amount: number, currency: string = "egp"): Promise<Stripe.Response<Stripe.PaymentIntent>> {
        const paymentMethod = await this.createPaymentMethod()
        const intent = await this.stripe.paymentIntents.create({
            amount: amount * 100,
            currency,
            automatic_payment_methods: {
                enabled: true,
                allow_redirects: "never"
            },
            payment_method: paymentMethod.id

        })
        return intent

    }
    async createPaymentMethod(token = "tok_visa"): Promise<Stripe.Response<Stripe.PaymentMethod>> {
        const paymentMethod = await this.stripe.paymentMethods.create({
            type: "card",
            card: {
                token
            }
        })
        return paymentMethod
    }
    async retrievePymentIntent(id: string) {
        const intent = await this.stripe.paymentIntents.retrieve(id)
        return intent
    }
    async confirmPaymentIntent(id: string): Promise<Stripe.Response<Stripe.PaymentIntent>> {
        const intent = await this.retrievePymentIntent(id)
        if (!intent)
            throw new BadRequestException("Invalid-intent")
        const paymentIntent = await this.stripe.paymentIntents.confirm(intent.id, { payment_method: "card" })
        return paymentIntent
    }

    async webhook(req: Request): Promise<{
        intentId: string;
        orderId: string;
    } | string> {
        let body = req.body;
        let event: any = {}

        let endpointSecret = process.env.STRIPE_WEBHOOK_SECRET

        if (endpointSecret) {
            // Get the signature sent by Stripe
            const signature = req.headers['stripe-signature'];
            try {
                // Ensure body is properly formatted for Stripe webhook verification
                const rawBody = Buffer.isBuffer(body) ? body : Buffer.from(body);
                event = this.stripe.webhooks.constructEvent(
                    rawBody,
                    signature as string,
                    endpointSecret
                );
            } catch (err) {
                throw new BadRequestException("⚠️  Webhook signature verification failed")
            }
        }
        let data: { intentId: string, orderId: string };
        if (event.type != "checkout.session.completed") {
            return "Done"
        }
        const session = event.data.object;
        const paymentIntentId = session.payment_intent;

        const intent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
        if (!intent)
            throw new NotFoundException("intent not found")
        if (intent.status != "succeeded")
            throw new BadRequestException("Invalid intent")
        return data = { intentId: intent.id, orderId: event.data.object.metadata.orderId }



    }
    async refund(id: string): Promise<Stripe.Response<Stripe.Refund>> {
        const refund = this.stripe.refunds.create({ payment_intent: id })
        return refund
    }
}