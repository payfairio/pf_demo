module.exports = (str, lang = 'eng', params = {}) => {
    const strings = {
        accept_deal_condition: {
            eng: "Accepted deal sum and conditions"
        },
        buyer_not_enough_money: {
            eng: "Buyer have not enough money now"
        },
        accept_deal_both: {
            eng: "Terms, conditions and sum of deal were accepted by both parties. Trade sum is transferred to a deposit until the end of the trade."
        },
        deal_sum_changed: {
            eng: `Deal sum changed to ${params.sum} ${params.coin}`
        },
        set_deal_condition: {
            eng: `Deal conditions changed to: ${params.conditions}`
        },
        accept_deal: {
            eng: "Deal completed. Money released from deposit to seller"
        },
        call_escrow: {
            eng: `${params.username} (${params.role}) opened the dispute. Please wait for escrows decision`
        },
        resolve_dispute: {
            eng: `Dispute resolved. Decision: ${params.decision} win. Money released from deposit to ${params.decision}`
        }
    }

    try {
        if (!strings.hasOwnProperty(str) || !strings[str].hasOwnProperty(lang)) {
            throw {success: false, 'message': `Value of ${str} (${lang}) not found`}
        }
        return strings[str][lang];
    } catch (err) {
        console.log("Strings error: " + err);
    }
}