<template>
    <div class="page-about">
        <div class="testpar"><parallax :breakpoint="'(min-width: 991px)'"><img :src="$config.staticUrl+'/images/about/sec-1-bg.jpg'"></parallax></div>
        <div class="bg-wrap">
            <div class="bg-right-top">
                <section id="sec-1">
                    <div class="container">
                        <b-col sm="8" lg="5" class="text-minheight">
                            <h1>About PayFair</h1>
                            <p>PAYFAIR is a decentralized Escrow platform which ensures the paramount security of all Cryptocurrency transactions made between two parties. It's enabled with PAYFAIR tokens (PFR), which is an ERC-20 token based on the Ethereum blockchain. We provide extremely low fees for all transactions in a safe, private and decentralized environment.</p>
                            <p>PFR tokens are an essential part of the ecosystem. Tokens create Trust nodes to ensure a safe environment for the transaction to take place.</p>
                            <p>Low fees are charged for ensuring that the transaction is safe and private.</p>
                            <p>PayFair will save your time when making a transaction: no third parties or bureaucracy.</p>   
                        </b-col>
                    </div>
                </section>
            </div>

            <div class="bg-right-mid">
                <div class="bg-line-bottom"></div>
                <section id="sec-2">
                    <div class="container">
                        <b-col sm="12">
                            <h2>How it works</h2>
                            <p>The self regulating system consists of independent Escrow nodes and Trust nodes (owners of PFR tokens). The heart of the Payfair ecosystem is the PFR token. It ensures that trades between users of Payfair are insured with their PFR tokens at stake. A percentage of the fee from the trade will go into a collection which is distributed to all Trust nodes (PFR holders) monthly.</p>
                            <p>You can become an owner of the PFR token by investing in Payfair</p>
                            <div class="how-it-works-img"></div>
                        </b-col>
                    </div>
                    <div class="phone-icon"></div>
                </section>
            </div>
        </div>
        <section id="sec-3">
            <div class="container">
                <h2>Roadmap</h2>
                <div class="rm-tooltip top">
                   <div class="item">
                        <div class="icon">
                            <img :src="$config.staticUrl+'/images/about/tooltips/presale-reverse.png'">
                        </div>
                        <h4>October 2017</h4>
                        <p>PFR token Pre-sale</p>
                   </div>
                   <div class="item">
                        <div class="icon">
                            <img :src="$config.staticUrl+'/images/about/tooltips/tokensale.png'">
                        </div>
                        <h4>December 2017</h4>
                        <p>token sale audit & <br> distribution</p>
                   </div>
                   <div class="item">
                        <div class="icon">
                            <img :src="$config.staticUrl+'/images/about/tooltips/mobileapp.png'">
                        </div>
                        <h4>Q2 2018</h4>
                        <p>application <br> launch</p>
                   </div>
                </div>
                <div class="roadmap">
                    <img :src="$config.staticUrl+'/images/about/rm-line.png'">
                </div>
                <div class="rm-tooltip bottom">
                   <div class="item">
                        <h4>November 2017</h4>
                        <p>PFR token public <br> sale</p>
                        <div class="icon">
                            <img :src="$config.staticUrl+'/images/about/tooltips/presale.png'">
                        </div>
                   </div>
                   <div class="item">
                        <h4>Q1 2018</h4>
                        <p>beta testing- Full <br> platform rolout</p>
                        <div class="icon">
                            <img :src="$config.staticUrl+'/images/about/tooltips/betatest.png'">
                        </div>
                   </div>
                   <div class="item">
                        <h4>Q3-Q4 2018</h4>
                        <p>integration of <br> further applications</p>
                        <div class="icon">
                            <img :src="$config.staticUrl+'/images/about/tooltips/integration.png'">
                        </div>
                   </div>
                </div>
            </div>
        </section>
        <section id="sec-3" class="mobile">
            <div class="container">
                <h2>Roadmap</h2>
                <div class="rm-tooltip top">
                   <div class="item">
                        <div class="icon">
                            <img :src="$config.staticUrl+'/images/about/tooltips/mobile/presale-reverse.png'">
                        </div>
                        <h4>October 2017</h4>
                        <p>PFR token Pre-sale</p>
                   </div>
                   <div class="item">
                        <div class="icon">
                            <img :src="$config.staticUrl+'/images/about/tooltips/mobile/tokensale.png'">
                        </div>
                        <h4>December 2017</h4>
                        <p>token sale audit & <br> distribution</p>
                   </div>
                   <div class="item">
                        <div class="icon">
                            <img :src="$config.staticUrl+'/images/about/tooltips/mobile/mobileapp.png'">
                        </div>
                        <h4>Q2 2018</h4>
                        <p>application <br> launch</p>
                   </div>
                </div>
                <div class="roadmap">
                    <img :src="$config.staticUrl+'/images/about/rm-line-reverse.png'">
                </div>
                <div class="rm-tooltip bottom">
                   <div class="item">
                        <div class="icon">
                            <img :src="$config.staticUrl+'/images/about/tooltips/mobile/presale.png'">
                        </div>
                        <h4>November 2017</h4>
                        <p>PFR token public <br> sale</p>
                   </div>
                   <div class="item">
                        <div class="icon">
                            <img :src="$config.staticUrl+'/images/about/tooltips/mobile/betatest.png'">
                        </div>
                        <h4>Q1 2018</h4>
                        <p>beta testing- Full <br> platform rolout</p>
                   </div>
                   <div class="item">
                        <div class="icon">
                            <img :src="$config.staticUrl+'/images/about/tooltips/mobile/integration.png'">
                        </div>
                        <h4>Q3-Q4 2018</h4>
                        <p>integration of <br> further applications</p>
                   </div>
                </div>
            </div>
        </section>
    </div>
</template>

<script>
    import Parallax from 'vue-parallaxy'
    export default {
        name: 'About',
         components: {
            Parallax
        },
        data: function () {
            return {
               
            };
        },
    }
</script>

<style scoped>
    .page-about{
        position: relative;
    }
    .testpar{
        position: absolute;
        right: 0;
        z-index: 0;
        width: 702px;
        top:0;
    }
    .testpar .Masthead{
        height: 497px!important;
        min-height: 532px;
        margin-top:-35px;
    }
    .bg-right-mid{
        position: relative;
        overflow: hidden;
    }
    .bg-right-mid:before{
        content: '';
        position: absolute;
        background: rgb(4,179,119);
        background: -moz-linear-gradient(top, rgba(52, 211, 179) 0%, rgb(32, 198, 155) 100%);
        background: -webkit-linear-gradient(top, rgba(4,179,119,1) 0%,rgb(32, 198, 155) 100%);
        background: linear-gradient(to top, rgb(52, 211, 179) 0%,rgb(32, 198, 155) 100%);
        filter: progid:DXImageTransform.Microsoft.gradient( startColorstr='#04b377', endColorstr='#23c89e',GradientType=0 );
        height: 100%;
        right: 0;
        width: 231px;
    }
    .text-minheight{
        min-height: 450px;
    }
    .phone-icon{
        content: '';
        position: absolute;
        width: 180px;
        height: 288px;
        bottom: 31px;
        background-size: contain;
        right: 230px;
    }
    .bg-line-bottom{
        background: rgb(52,211,179);
        background: -moz-linear-gradient(right, rgb(52, 211, 179) 0%,rgb(50, 210, 177) 100%);
        background: -webkit-linear-gradient(right, rgb(52, 211, 179) 0%,rgb(50, 210, 177) 100%);
        background: linear-gradient(to right, rgb(52, 211, 179) 0%,rgb(50, 210, 177) 100%);
        filter: progid:DXImageTransform.Microsoft.gradient( startColorstr='#34d3b3', endColorstr='#1ec498',GradientType=1 );
        width: 100%;
        height: 31px;
        position: absolute;
        bottom: 0;
        z-index: 1;
    }
    .container{
        padding-top: 0;
    }
    .container p{
        font-family: 'MuseoSans';
        font-size: 16px;
        color:#000;
        line-height: 22px;
        margin-bottom: 20px;
    }
    .container h1, .container h2{
        margin-top: 0;
        color:#181818;
        text-align: left;
        font-size: 3rem;
        font-weight: 600;
    }
    #sec-1{
        padding-top: 62px;
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
        margin-left: 129px;
    }
    #sec-3 .rm-tooltip.bottom .item:first-child{
        margin-left: 202px;
    }
    #sec-3 .rm-tooltip.bottom .item:nth-child(2){
        margin-left: 105px;
    }
    #sec-3 .rm-tooltip.bottom .item:last-child{
        margin-left: 109px;
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
    .how-it-works-img{
        background-size: contain;
        width: 100%;
        height: 295px;
        margin: 50px 0;
        position: absolute;
    }
    #sec-3.mobile{
        display: none;
    }
    @media (max-width: 767px){
        .testpar{
            display: none;
        }
        .text-minheight{
            min-height: initial;
        }
        .container h1, .container h2{
            font-size: 2rem;
        }
        .container p{
            font-size: 18px;
            line-height: 26px;
        }
        .bg-right-top{
            background: none;
        }
        .bg-right-mid:before{
            width: 0;
        }
        #sec-2{
            background: none;
            padding-bottom: 20px;
        }
        #sec-2 p{
            margin: 0;
        }
        .how-it-works-img{
            position: inherit;
        }
        .phone-icon{
            width: 0;
        }
        .bg-line-bottom{
            width: 0;
        }
        #sec-3 {
            display: none;
        }
        #sec-3.mobile{
            display: block;
        }
        #sec-3.mobile .rm-tooltip.top{
            float:left;
            margin-top: 75px;
            width: 45%;
        }
        #sec-3.mobile .rm-tooltip .item{
            margin-left: 0!important;
            margin-right: 0;
            display: block;
        }
        #sec-3.mobile .rm-tooltip .item p,
        #sec-3.mobile .rm-tooltip .item h4{
            font-size: 14px;
        }
        #sec-3.mobile .rm-tooltip.top .item{
            text-align: left;
        }
        #sec-3.mobile .rm-tooltip.top .item:nth-child(2){
            margin-top: 213px;
        }
        #sec-3.mobile .rm-tooltip.top .item:last-child{
            margin-top: 194px;
        }
        #sec-3.mobile .roadmap{
            float:left;
            width: 10%;
            text-align: center
        }
        #sec-3.mobile .roadmap img{
            height: 100%;
        }
        #sec-3.mobile .rm-tooltip.bottom .item{
            text-align: right;
        }
        #sec-3.mobile .rm-tooltip.bottom{
            float: right;
            margin-top:250px;
            width: 45%; 
        }
        #sec-3.mobile .rm-tooltip.bottom .item:nth-child(2){
            margin-top: 196px;
        }
        #sec-3.mobile .rm-tooltip.bottom .item:last-child{
            margin-top: 195px;
        }
    }
    @media(max-width: 991px){
        .bg-right-top{
            height: initial;
        }
    }
    @media (min-width: 768px) and (max-width: 991px){
        .bg-right-mid{
            margin-top: -110px;
        }
        .bg-right-mid:before{
            width: 126px;
        }
        .container h1{
            font-size: 2rem;
        }
        .container p {
            font-size: 14px;
            color: #000;
            line-height: 20px;
            margin-bottom: 15px;
        }
        .testpar{
            width: 425px;
        }
        .testpar .Masthead[data-v-4d25ce03] {
            height: 332px!important;
            min-height: 320px;
        }
        #sec-1{
            padding-top: 15px;
        }
        #sec-2{
            background-size: auto 350px;
        }
        #sec-2 h2 {
            padding-top: 135px;
        }
        #sec-2 p{
            width: 85%;
        }
        .phone-icon{
            width: 120px;
            height: 192px;
            bottom: 31px;
            right: 125px;
        }
        .how-it-works-img{
            height: 230px;
        }
        #sec-3 .rm-tooltip .item .icon{
            width:70px;
            margin:auto;
        }
        #sec-3 .rm-tooltip .item p,
        #sec-3 .rm-tooltip .item h4{
            font-size: 16px;
        }
        #sec-3 .rm-tooltip .item{
            margin-right: 10px;
        }
        #sec-3 .rm-tooltip.top .item:first-child{
            margin-left: 6px;
        }
        #sec-3 .rm-tooltip.top .item:nth-child(2){
            margin-left: 73px;
        }
        #sec-3 .rm-tooltip.top .item:last-child{
            margin-left: 101px;
        }
        #sec-3 .rm-tooltip.bottom .item:first-child{
            margin-left: 121px;
        }
        #sec-3 .rm-tooltip.bottom .item:nth-child(2){
            margin-left: 83px;
        }
        #sec-3 .rm-tooltip.bottom .item:last-child{
            margin-left: 75px;
        }
        #sec-3 .rm-tooltip.bottom .item h4{
            margin-top: 20px;
        }
        #sec-3 .rm-tooltip .item .icon{
            margin-bottom: 27px;
        }

    }
    @media (min-width: 992px) and (max-width: 1199px){
        .container h1, .container h2{
            font-size: 2.5rem;
        }
        #sec-2 p{
            width: 75%;
        }
        .phone-icon{
            width: 169px;
            height: 270px;
        }
        #sec-3 .rm-tooltip.top .item:first-child{
            margin-left: 12px;
        }
        #sec-3 .rm-tooltip.top .item:nth-child(2){  
            margin-left: 42px;
        }
        #sec-3 .rm-tooltip.top .item:last-child{
            margin-left: 73px;
        }
        #sec-3 .rm-tooltip.bottom .item:first-child{
            margin-left: 155px;
        }
        #sec-3 .rm-tooltip.bottom .item:nth-child(2){
            margin-left: 49px;
        }
        #sec-3 .rm-tooltip.bottom .item:last-child{
            margin-left: 50px;
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
            height: 200px;
        }
    }
    @media (min-width: 1200px) and (max-width: 1390px){
        #sec-2 p{
            width: 80%;
        }
    }
</style>