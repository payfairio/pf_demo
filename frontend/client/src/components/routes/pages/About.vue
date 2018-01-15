<template>
    <div class="page-about">
        <section id="sec-1">
            <div class="ab-container">
                <b-col sm="5">
                    <h1>About PayFair</h1>
                    <p>PAYFAIR is a decentralized Escrow platform which ensures the paramount security of all Cryptocurrency transactions made between two parties. It's enabled with PAYFAIR tokens (PFR), which is an ERC-20 token based on the Ethereum blockchain. We provide extremely low fees for all transactions in a safe, private and decentralized environment.</p>
                    <p>PFR tokens are an essential part of the ecosystem. Tokens create Trust nodes to ensure a safe environment for the transaction to take place.</p>
                    <p>Low fees are charged for ensuring that the transaction is safe and private.</p>
                    <p>PayFair will save your time when making a transaction: no third parties or bureaucracy.</p>   
                </b-col>
            </div>
        </section>
        <section id="sec-2">
            <div class="ab-container">
                <b-col sm="12">
                    <h2>How it works</h2>
                    <p>The self regulating system consists of independent Escrow nodes and Trust nodes (owners of PFR tokens). The heart of the Payfair ecosystem is the PFR token. It ensures that trades between users of Payfair are insured with their PFR tokens at stake. A percentage of the fee from the trade will go into a collection which is distributed to all Trust nodes (PFR holders) monthly.</p>
                    <p>You can become an owner of the PFR token by investing in Payfair</p>
                    <div class="how-it-works-img">
                        <img :src="$config.staticUrl+'/images/about/scheme.png'">
                    </div>
<!--                     <div class="sec-2-icon">
                        <img :src="$config.staticUrl+'/images/about/phone-icon.png'">
                    </div> -->
                </b-col>
            </div>
        </section>
        <section id="sec-3">
            <div class="ab-container">
                <h2>Roadmap</h2>
                <div class="rm-tooltip top">
                   <div class="item">
                        <div class="icon">
                            <img :src="$config.staticUrl+'/images/about/icons/presale-reverse.png'">
                        </div>
                        <h4>October 2017</h4>
                        <p>PFR token Pre-sale</p>
                   </div>
                   <div class="item">
                        <div class="icon">
                            <img :src="$config.staticUrl+'/images/about/icons/tokensale.png'">
                        </div>
                        <h4>December 2017</h4>
                        <p>token sale audit & <br> distribution</p>
                   </div>
                   <div class="item">
                        <div class="icon">
                            <img :src="$config.staticUrl+'/images/about/icons/mobileapp.png'">
                        </div>
                        <h4>Q2 2018</h4>
                        <p>mobile application <br> launched on IOS</p>
                   </div>
                </div>
                <div class="roadmap">
                    <!-- <div class="line">
                        <img :src="$config.staticUrl+'/images/about/rm-line.png'">
                    </div> -->
                    <img :src="$config.staticUrl+'/images/about/rm-line.png'">
                </div>
                <div class="rm-tooltip bottom">
                   <div class="item">
                        <h4>November 2017</h4>
                        <p>PFR token public <br> sale</p>
                        <div class="icon">
                            <img :src="$config.staticUrl+'/images/about/icons/presale.png'">
                        </div>
                   </div>
                   <div class="item">
                        <h4>Q3 2018</h4>
                        <p>beta testing- Full <br> platform rolout</p>
                        <div class="icon">
                            <img :src="$config.staticUrl+'/images/about/icons/betatest.png'">
                        </div>
                   </div>
                   <div class="item">
                        <h4>Q4 2018</h4>
                        <p>integration of <br> further applications</p>
                        <div class="icon">
                            <img :src="$config.staticUrl+'/images/about/icons/integration.png'">
                        </div>
                   </div>
                </div>
            </div>
        </section>
    </div>
</template>
<script>
    export default {
        name: 'About',
        data: function () {
            return {

            };
        },
    }
</script>
<style scoped>
    #app-content-container{
        padding-top: 0;
    }
    #app-content-container p{
        font-family: 'MuseoSans';
        font-size: 16px;
        color:#000;
        line-height: 22px;
        margin-bottom: 20px;
    }
    .ab-container h1, .ab-container h2{
        margin-top: 0;
        color:#181818;
        text-align: left;
        font-size: 3rem;
        font-weight: 600;
    }
    #sec-1 p:last-child{
        margin-bottom: 0;
    }
    #sec-2 h2{
        padding-top: 83px;
    }
    #sec-2 p{
        margin: 0 5rem 0 0;
    }
    .sec-2-icon{
        position: absolute;
        right: 2.9rem;
        width: 21%;
        bottom: -20.2rem;
    }
    .how-it-works-img {
        text-align: center;
        margin-bottom: 2rem;
        width: 50%;
        margin: 4.5rem auto;
    }
    #sec-3{
        margin-top:35px;
        color:#000;
    }
    #sec-3 h2{
      text-align: center;
      margin-top: 37px;
    }
    #sec-3 .rm-tooltip h4{
        font-weight: 600;
        margin-bottom: 0;
        line-height: 19px;
    }
    #sec-3 .rm-tooltip .item{
        display: inline-block;
        text-align: center;
        margin-right: 80px;
    }
    #sec-3 .rm-tooltip.top .item{
        vertical-align: top;
    }
    #sec-3 .rm-tooltip.bottom .item{
        vertical-align: bottom;
    }
    #sec-3 .rm-tooltip .item p{
        font-size: 20px;
        line-height: 19px;
        margin-bottom: 20px;
    }
    #sec-3 .rm-tooltip.top .item:first-child{
        margin-left: 33px;
    }
    #sec-3 .rm-tooltip.top .item:nth-child(2){
        margin-left: 98px;
    }
    #sec-3 .rm-tooltip.top .item:last-child{
        margin-left: 95px;
    }
    #sec-3 .rm-tooltip.bottom .item:first-child{
        margin-left: 202px;
    }
    #sec-3 .rm-tooltip.bottom .item:nth-child(2){
        margin-left: 107px;
    }
    #sec-3 .rm-tooltip.bottom .item:last-child{
        margin-left: 107px;
        margin-right: 0;
    }
    #sec-3 .rm-tooltip.bottom .item h4{
        margin-top: 20px;
    }
    #sec-3 .rm-tooltip .item .icon{
        margin-bottom: 27px;
    }
    #sec-3 .roadmap .line{
        height: 6px;
        width: 100%;
        background: rgb(24,77,166);
        background: -moz-linear-gradient(left, rgba(24,77,166,1) 0%, rgba(41,137,216,1) 50%, rgba(16,133,191,1) 100%);
        background: -webkit-linear-gradient(left, rgba(24,77,166,1) 0%,rgba(41,137,216,1) 50%,rgba(16,133,191,1) 100%);
        background: linear-gradient(to right, rgba(24,77,166,1) 0%,rgba(41,137,216,1) 50%,rgba(16,133,191,1) 100%);
        filter: progid:DXImageTransform.Microsoft.gradient( startColorstr='#184da6', endColorstr='#1085bf',GradientType=1 );
    }
    @media (min-width: 1200px) and (max-width: 1500px){
        /*#sec-2 {
            background: url(../images/about/sec-2-right-bg.png) no-repeat 174px 0, url(../images/about/sec-2-left-bg.png) no-repeat -13rem 10px;
            background-size: contain;
            height: 799px;
        }*/
        #sec-2 p {
            margin: 0 10rem 0 0;
        }
        .how-it-works-img{
            width: 35%;
        }
        .sec-2-icon{
            right: 0;
        }
    }
    @media (min-width: 992px) and (max-width: 1199px){
        #sec-3 .rm-tooltip.top .item:first-child{
            margin-left: 12px;
        }
        #sec-3 .rm-tooltip.top .item:nth-child(2){
            margin-left: 42px;
        }
        #sec-3 .rm-tooltip.top .item:last-child{
            margin-left: 39px;
        }
        #sec-3 .rm-tooltip.bottom .item:first-child{
            margin-left: 155px;
        }
        #sec-3 .rm-tooltip.bottom .item:nth-child(2){
            margin-left: 47px;
        }
        #sec-3 .rm-tooltip.bottom .item:last-child{
            margin-left: 53px;
        }
        #sec-3 .rm-tooltip.bottom .item h4{
            margin-top: 20px;
        }
        #sec-3 .rm-tooltip .item .icon{
            margin-bottom: 27px;
        }
        #sec-3 .roadmap .line{
            height: 6px;
            width: 100%;
            background: rgb(24,77,166);
            background: -moz-linear-gradient(left, rgba(24,77,166,1) 0%, rgba(41,137,216,1) 50%, rgba(16,133,191,1) 100%);
            background: -webkit-linear-gradient(left, rgba(24,77,166,1) 0%,rgba(41,137,216,1) 50%,rgba(16,133,191,1) 100%);
            background: linear-gradient(to right, rgba(24,77,166,1) 0%,rgba(41,137,216,1) 50%,rgba(16,133,191,1) 100%);
            filter: progid:DXImageTransform.Microsoft.gradient( startColorstr='#184da6', endColorstr='#1085bf',GradientType=1 );
        }
        .how-it-works-img{
            width: 40%;
        }
    }
/*temporary*/
    .container {
        max-width: 100%!important;
        padding-right: 0;
        padding-left: 0;
    }
    .footer .container{
        padding-left: 15px;
        padding-right: 15px;
    }
    .ab-container{
        padding-right: 15px;
        padding-left: 15px;
        margin-right: auto;
        margin-left: auto;
    }
    @media (min-width: 576px){
        .ab-container {
            max-width: 540px;
        }
    }
    @media (min-width: 768px){
        .ab-container {
            max-width: 720px;
        }
    }
    @media (min-width: 992px){
        .ab-container {
            max-width: 960px;
        }
    }
    @media (min-width: 1200px){
        .ab-container {
            max-width: 1140px;
        }
    }
</style>