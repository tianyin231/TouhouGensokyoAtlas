/* 溪桥—夜雀屋整体树形样板。只替换原矩阵身份，所有造型均为 P。
 * Source identities: overview 7398a263… / legacy 46e874f6… (040e536).
 * Eight affine words plus verified zero/one words represent all 16 Float32s.
 * The table is derived from the original legacy kind, never plantSites.
 */
(function(G){'use strict';
const ROI=[810,125,1145,330],KINDS=['broadleaf','hinoki','cherry','willow'];
const AFFINE_WORDS=[0,2,5,8,10,12,13,14],ZERO_WORDS=[1,3,4,6,7,9,11];
const identityCodes=`
03d0addadbf8c0f733f8d41f33f8c0f733d0addad446589964220f23e43664490
03dc18c78bfef50b73fea20b73fef50b73dc18c78445cd4cd42035c2d4319b3a9
03dcbb7a3bfb0006a3fbc20563fb0006a3dcbb7a3446e5b3d421a1505434b601e
03e305c4fbfb900003fb140313fb900003e305c4f448d69af422e64c443843101
03e4884b7bf85ca293f7d5e683f85ca293e4884b7444de118420185ad43163570
03e50ff5cbfb182253fad17aa3fb182253e50ff5c447d50834225fe95437a7a95
03e87c20c3fa0fb533f90fc7cbfa0fb533e87c20c44761ead421d889a4358f545
03e885b1fbf8b2d733f978b3e3f8b2d733e885b1f448ccda54227340a436cd519
03eb46ab0bfa869483fb987183fa869483eb46ab0446d5b2b4222361e436641b8
03eb6ffb03f90ffa73f89094fbf90ffa73eb6ffb0448eb4d74231774b438849ea
03edb7166bf89eab33f8eca0a3f89eab33edb716644507443420422e8431f64c6
03edbaafa3f787c6d3f843ce1bf787c6d3edbaafa44535f4042162907434e6f4e
03ef4f3d5bf82693e3f8128903f82693e3ef4f3d54487ef5a422197e743695c31
03efc981fbfe1fefa3fff2cc83fe1fefa3efc981f446e1b414211f198432eadeb
03f047acb3f966a983fac551cbf966a983f047acb448a9dfc422d4aa54389e643
03f0f16013f8bc5e93fa0ae8fbf8bc5e93f0f160144825e40421bc0f043602137
03f11c9bfbfe0f7143fd099ac3fe0f7143f11c9bf444e6b1c41f61039430188db
03f1301b13fd2378c3fd495dfbfd2378c3f1301b14455387841fb3d65430f7221
03f21c1593fcf9f463fcde46fbfcf9f463f21c159445be5624220313343692735
03f24277d3fdcc1f53ffa9561bfdcc1f53f24277d444d45b9421d05b2435cebac
03f2862ca3fd54e043fe9d574bfd54e043f2862ca446bb44442134dd5433597d9
03f2ce84b3fa6a77b3fbc677dbfa6a77b3f2ce84b446f20874226384243722254
03f4882b7bf2eb95b3f91866e3f2eb95b3f4882b74463700f4220597f4365bc22
03f5b36e1bfc3f1c03ffa798e3fc3f1c03f5b36e1447073e5421306e44331be2d
03f6e3b2ebf97e9693fca69173f97e9693f6e3b2e4453ef9741f9355c430c1ccd
03f7769d93f10f58b3f85eb49bf10f58b3f7769d94489584a4227fe4543939a2a
03f7817e7bf7c8d9d3fa5d1dc3f7c8d9d3f7817e74468735242170a36434567e3
03f7e25683fcfd8ab4007b606bfcfd8ab3f7e256844721829422e63254385d54b
03f828dec3ed7c2293f92d389bed7c2293f828dec444b13f1420181de43144efc
03f8622b83df03eab3f8f38b0bdf03eab3f8622b8448a81d2422426a94369c143
03f86dbe63f8dd72c3fcd0bfabf8dd72c3f86dbe64466c56e4215a7204342ab6e
03f8bb7233e0eadb73f849848be0eadb73f8bb723447dc3e9421e6e6143631a7c
03f8cdec23ec09b493f902fb0bec09b493f8cdec2447975d7421c6bae4358a298
03f91346bbf5f46873fb605583f5f46873f91346b44541e504208329d432c18e4
03f91e802bf8bea413fcd27cf3f8bea413f91e802445e9b534205ab7b431dcc22
03f958aee3f13aa2c3fa96bd1bf13aa2c3f958aee446874a74220d33e43643217
03f9612e73f4c10ee3fabefafbf4c10ee3f9612e7445f46ff421948444353da2c
03f9776453ef59b083f91317dbef59b083f9776454472df12421c86544353903d
03f9d6ad5bc9b98a93f9ea72e3c9b98a93f9d6ad5446bbdc442184ff14346d3f9
03fa3bacdbeb5083d3fa75b7e3eb5083d3fa3bacd445244af421107b34341317f
03fa4e68a3f7e823a3fcadd87bf7e823a3fa4e68a4477713e4214197f433b9b7c
03fa7f2953fb021843fffefd9bfb021843fa7f295448c5c9f4232eaa24393a02a
03fa8f753bf4600383fc7762b3f4600383fa8f753446356a1421c917d435a8f1b
03faa6c903f14c4073fc8552bbf14c4073faa6c90444ddad7420f5142433a30b3
03faac9fa3eb9719b3fb64ae0beb9719b3faac9fa44725e0c4227295c437516f4
03fb190243f93424e3fd854a6bf93424e3fb19024448dfb8a4233635f438fdb4b
03fb6ed083f90a9923ff95d77bf90a9923fb6ed0844644df54227c80a437bdc39
03fbbc3c93dd7e4073fd0908abdd7e4073fbbc3c94484cf8e421e277d4366bb28
03fc0d9a6bf4af7b63fea074a3f4af7b63fc0d9a6446150b64224c06543746079
03fc0df293f48eca43fdcbfefbf48eca43fc0df29446df0e0422c820c4382e92d
03fcde8cbbf0ad7553fc8b4e63f0ad7553fcde8cb448e750342354be24393c83d
03fdb7de0bd2ecb053fcdb3503d2ecb053fdb7de044787547422ed687438957e4
03fea57033d87ee063fd2ac2abd87ee063fea5703446fe321422dfefe43851515
03ff17fc3be8560373fdb44f13e8560373ff17fc344665a11420d12b54327865a
03ff28171bc02fdd33ff0fb913c02fdd33ff28171444d274f4216de07434c8c88
03ffb12febe90579c40035a233e90579c3ffb12fe446ac6e0422b2c67438161c9
0bde47b88bfb66aed3fc382403fb66aedbde47b88444b95554201cefd431580f1
0be3575913fa545703fa2931bbfa54570be3575914485451a421f74f8436a1305
0be5c0808bffa122d3fe6865c3ffa122dbe5c08084466fdb84228af3b437d06a7
0be817671bf8f006f3f9126dd3f8f006fbe8176714481f26e422a1ea1438bb5bf
0be83adb83fe9ca2b4000d3ebbfe9ca2bbe83adb8444bee2c41f787a243020f19
0be8a42b03ff280c33ffa1b84bff280c3be8a42b04450c778421aceee43594519
0be8bab5bbf8217a03f94fc303f8217a0be8bab5b447734ee422908b9437df020
0be9884bd3f97da273fa07ea7bf97da27be9884bd4453579d42041a8e43214f5b
0be9cf039bfd62df83fc30bde3fd62df8be9cf039445141fd41f61b624304a915
0bea4e37d3faf5ad43fa67afdbfaf5ad4bea4e37d444fad3242127d1743433f7d
0bef6a649bfa5871b3f9cef023fa5871bbef6a6494487e0004229f95e43968000
0bf08584a3fb14f953fb4ed0cbfb14f95bf08584a4471d003421d6aad43562e9c
0bf1d6493bfe211883ffee0753fe21188bf1d64934457021b421d011043610255
0bf2d41f53f87b9cf3f9f7eefbf87b9cfbf2d41f5448e1a49423010f7438682cd
0bf46407fbf5770e63f8b51e93f5770e6bf46407f4461348c420f588f43363975
0bf508e15bfc989d83fd39a423fc989d8bf508e154472a2584214adaf4338612d
0bf59aa55bf7c31d23fb4b8e03f7c31d2bf59aa5544868417422c31c34397f8e6
0bf5b0784bf351da33f85a4903f351da3bf5b07844488919d42234a4c436cd817
0bf6230fcbf77fd0c3faeadfb3f77fd0cbf6230fc4480374c421dd4314363a511
0bf62a6583fc4689c3feb2a3abfc4689cbf62a6584460b5cc4207d5d84320ca71
0bf6412fcbf160b903f80b2043f160b90bf6412fc447b7391421c6c9f435abeab
0bf6b69673fc7818f3ff3654bbfc7818fbf6b6967447600cb4214b1e3433badb7
0bf7541143f7cf62e3fc51bb5bf7cf62ebf75411444831ea4421e151243673a9b
0bf7ba3833fd66ce63fe9b0b0bfd66ce6bf7ba383447a26ce422f9b04438bf54a
0bf8609c3bd9db2473f950ee43d9db247bf8609c34481c00042251f6a437c0000
0bf88e645be9c7d4b3f91b6693e9c7d4bbf88e645447fb77c42271e4a43808e96
0bf91552a3ef14a233f98612ebef14a23bf91552a44838da44227917f4394cfc5
0bf9ca4443eb032f53f9cc567beb032f5bf9ca4444470080842272cfd4374eb77
0bfa250be3f7d56753fda74cfbf7d5675bfa250be4468b106420fa63e432c8a10
0bfa25160be56c6ac3fab66d53e56c6acbfa25160448deb6a4228b11b436df13f
0bfa3f72cbd03e1233fa9fe183d03e123bfa3f72c44816a9242258c91437e6667
0bfa468babe61054b3fa6c8443e61054bbfa468ba447a46024228a151437fcf47
0bfa50f11bf733ef83fd64c7e3f733ef8bfa50f114463e8f6420b3b1d4325c042
0bfb235d93f924fee3fea2886bf924feebfb235d94485bd5e421865e84355869f
0bfb4b6c93ded845c3fc4c561bded845cbfb4b6c9448a148142262f3543723262
0bfbca9753d93c5783fb2aa98bd93c578bfbca97544658e4c4213f98c433ec42c
0bfbd3cb93fa233453ffde18bbfa23345bfbd3cb94476debe42307858438b2062
0bfca0db5bf4c98593fd85ce53f4c9859bfca0db544512ab4421cf719435f6811
0bfce7c333efab8f33fe8c839befab8f3bfce7c3344629b764224f17f43743077
0bfd189673dcc5ced3fbc8717bdcc5cedbfd1896744810d78422d3d83438e8d61
0bff49cf03e2912f83fea9ec4be2912f8bff49cf0447ce6a8422db75f438ac683
13e05e8ae3fd934ba3fd45531bfd934ba3e05e8ae448b32494224297f4367a0e9
13e48a57a3fcc67ec3fe22b9bbfcc67ec3e48a57a448537a0421c52de4360ed8c
13e9bb04a3ff234703ff6f311bff234703e9bb04a44660f914212b1be433a2697
13eaf6ad43fe2575d3fe757efbfe2575d3eaf6ad4448472ba4219a24a435a55ba
13ee8cb33bffcdd8f3ffcfbee3ffcdd8f3ee8cb33447101da4231e75a438b5880
13ef2e8143fc3eb0f3fdcd191bfc3eb0f3ef2e8144488f350421f4ff9435f5be2
13f08594ebfb945ce3fca0c073fb945ce3f08594e4450d92942041648431f8eec
13f1d29223fc601173fe72464bfc601173f1d2922446247ee4221ae7b436a6b9b
13f2889b0bf946a853fa7fd803f946a853f2889b0448281c442290f094390c3f1
13f2987fe3fc922c03fd3aa86bfc922c03f2987fe445ce912421e31194362e7a3
13f33fbc5bfbb179d3fe1b4553fbb179d3f33fbc54480e951421aeac0435c3864
13f38b0d43fdd1b924005e810bfdd1b923f38b0d4447e16be421728ea434e1025
13f61c66fbfa9b0993fe249543fa9b0993f61c66f444fc5714215327f434a17da
13f79590d3f1ddeae3f92bcadbf1ddeae3f79590d4484f33e422acfbb4397529a
13f8409f9bf9f514d3fc1083f3f9f514d3f8409f94467a0be421052684330599c
13f84b8ea3f508c8e3fa902babf508c8e3f84b8ea44880c16422a58934396ad0a
13f9677cabfa75a253fcebd4b3fa75a253f9677ca44762f0e421901c5434a52aa
13fa89d42bf5912e33fd343053f5912e33fa89d42444aae0241fad36e43071566
13fb0eafebf77da603fef5a613f77da603fb0eafe445bab374207af9f4327706b
13fb4a0e8bf0c4a233fba8d093f0c4a233fb4a0e844738220421aa377434d94a5
13fd045a93f80afb43ff0bef4bf80afb43fd045a9445dc1724209d534432af41e
13fd5da503f5b04033fe1b9d5bf5b04033fd5da50448db2fa4225fddb4364c5bf
13fd85d753f0992f43fd75ed3bf0992f43fd85d75445137704219e38143571015
13fe2cb9fbf2ef3783fddd5d23f2ef3783fe2cb9f447045bb42298ab9437c308f
13fe335fbbea29f8f3fd02b343ea29f8f3fe335fb4482a77c421b63d9435f450c
1bcf56ebf3fe192063ff19e16bfe19206bcf56ebf4467ae684227521543787356
1bd846e41bfd14d0d3fc2da913fd14d0dbd846e41447b1d984219c8d1435260aa
1be2101ae3fe5ad903fcc31adbfe5ad90be2101ae444f155841fbccd3430c1bcd
1becb84f13fc723b03fc67fa1bfc723b0becb84f1447f15af422a2cbf4385c9c1
1befa8d313fbc06683fb669febfbc0668befa8d31448b19394220ebd1435d6ee4
1bf086affbff51a6c3ff3dfce3ff51a6cbf086aff444cd51c42152e2343480e69
1bf1b4e033fce2ed73fcf7371bfce2ed7bf1b4e034464ec06422567ea437433b3
1bf2208edbfba85e93fdfdcf43fba85e9bf2208ed447b4836422aa7b44383fa95
1bf3ce45e3fe0f57f3ff7041cbfe0f57fbf3ce45e445276434217b641435206b9
1bf6eda5fbfb0a7e43fe869933fb0a7e4bf6eda5f447f8dda42169fdd434e2531
1bf778dd2bfc4eb113fff59dc3fc4eb11bf778dd24453b71b42034b94431f4dfe
1bf7ebcb93f9e1bdb3fb78e3cbf9e1bdbbf7ebcb9446297f9420e3e774331231c
1bf89ef44bfb4291f3fd45e693fb4291fbf89ef44448d6e264230f8bc438ac616
1bf8aafc2beefe10e3f926df73eefe10ebf8aafc2448a3d85422cc033438f2688
1bf8fcd933f87ec923fc93428bf87ec92bf8fcd934471ec744216ff1b434048ba
1bf9707e6bfc3ff114008c20d3fc3ff11bf9707e644795326422b39bb4383b4ce
1bfa0b34a3f84eb393fe6fe10bf84eb39bfa0b34a445308cd420003344315edbf
1bfa17d05bf9453f83fc1b1503f9453f8bfa17d05445650a34219b39943580f6e
1bfa46771bf8f7d8a3ff4196d3f8f7d8abfa467714473b405422986b3437cf61c
1bfa658f33d05cd773fac89f7bd05cd77bfa658f34483c000422a654043970000
1bfa94a3fbf5acf7b3fb860223f5acf7bbfa94a3f448ddbaa4233d1c04391881d
1bfaf6c8cbf7af3e53fdf382f3f7af3e5bfaf6c8c446030614209604143264402
1bfb0f9fe3f82efe13fe9f834bf82efe1bfb0f9fe446b02fa4216f57e4342d2f8
1bfb29f0ebfa8ed35400803663fa8ed35bfb29f0e445b1a91421e12f9436340e8
1bfba08e3bf86d2e23fe955733f86d2e2bfba08e3448a56054221e3e74362f08a
1bfc0785a3ef6afa43fc0d1b4bef6afa4bfc0785a444d058c42007cea43128eb4
1bfc294af3f71201d3fda8ba8bf71201dbfc294af44760e85422db21a438607c8
1bfc5435bbe6479ca3fdd579b3e6479cabfc5435b4470615f4218bb7d43462c01
1bfcba3de3f5603c03fed589abf5603c0bfcba3de44874c24421e34ff43613e79
1bfcc45c33e8e79b83fbdcc87be8e79b8bfcc45c34467b6dc4224e9f24371161c
1bfd0418cbb3fd4b03fc8fc263b3fd4b0bfd0418c448deacb42320305438c2e78
1bfd083e2bf08190b3fc3a7103f08190bbfd083e2446e4b294227813e43763cdd
1bfd299d53e6dbbc13fe85b24be6dbbc1bfd299d5446bb27b4228874e437a35fc
1bfd7928c3ec1b5053fd0fd0ebec1b505bfd7928c448359a3421830444356bea0
1bfe18e4abf0a10ed4000c26b3f0a10edbfe18e4a44815906422976174386ed80
1bfe8a8953f47b9b540019fb9bf47b9b5bfe8a895448e2364422612594363069a
1bfe8e639bf4d013f3ffb5e5b3f4d013fbfe8e6394469274742140ab6433ad423
1bff642fdbf0960114006fc6b3f096011bff642fd4464725e4222c678436c7511
23c1d59763f89f96c3f7e0098bf89f96c3c1d5976448be7d542278bf04371445b
23c63d8ae3f8cc9eb3f7db87bbf8cc9eb3c63d8ae448a4000422caac2438e8000
23eb03247bf9217183f9289db3f9217183eb032474461d71542116f68433b7ffb
23edf683c3fe0bc893ff7d5ccbfe0bc893edf683c448bd081422f54e9438a8c24
23f0fafb13f8b59593f8cf797bf8b59593f0fafb14460bbc4421bcc00435a08a9
23f21b12abf9422823f9d93b83f9422823f21b12a445022824203b625431e009d
23f41bac9bfcdfbda3fe094ad3fcdfbda3f41bac9446e6e3942139d5f433496b6
23f5eeff93fd79ed13fe494e2bfd79ed13f5eeff94453a600421ae375435acd76
23f80547abfd0ec313fde08633fd0ec313f80547a44510f3c41f7a259430719ad
23f894fa0bfce1b0f3ff000cb3fce1b0f3f894fa0447ef251422d67d6438bfccc
23f8c47323f71aaa33fbbecbebf71aaa33f8c4732446cb9b24219af5d434ad358
23f8ce6a3bcea25bb3f976a1f3cea25bb3f8ce6a344782aaa421dacd2435b3e91
23f9f47d83fc04cdf3ff4fa90bfc04cdf3f9f47d84475258f422ea2f8438729e7
23fa0ade5bf0858323fa0439f3f0858323fa0ade5448c600e422d3caa4383cff1
23fa8fba43f4015c73fb87a5abf4015c73fa8fba4445bbb894201cf814316ae94
23fba8ad7bf8dc8b74001add43f8dc8b73fba8ad74477ec8e421768374347146b
23fbb75383c8c13593fb7f865bc8c13593fbb75384481124e42271add4381e0a4
23fbd61bbbf775f023fceef563f775f023fbd61bb4464d9ca420dfe50432cf920
23fbfe4fc3d8610373facd387bd8610373fbfe4fc448037f24229eda043864841
23fcd55bebf16de0a3fe961ad3f16de0a3fcd55be4486c48a421c7de2435e156e
23fd1ee2cbf53e4033fe5ac523f53e4033fd1ee2c446935ce42294398437d9a59
23fe3cce03ed1b2c93fe87e74bed1b2c93fe3cce0446a336f4224ba05436f4178
23ff2e51d3ed95d2e3ffec826bed95d2e3ff2e51d4474dbcf4229b06f437e27a7
23ff317b0be66a94d3fe44a213e66a94d3ff317b0448c8383422177c64359dcda
2bd6155a3bfd85ffc3fd377643fd85ffcbd6155a3445dd30242241fac4374623c
2bdcb7cc0bfdb90023fedb46a3fdb9002bdcb7cc0445a3bd04205738d4322c893
2bdf1c1db3f8c47893f9a9bf4bf8c4789bdf1c1db444bfd6d42112358433d6e75
2becb06a6bfce57593fd489633fce5759becb06a64464adb7420cb36643292145
2bf1a7a893f8c5fef3f9f7a52bf8c5fefbf1a7a89447557c94226659343742797
2bf3e4d803fe8d2963ffb6779bfe8d296bf3e4d80445f7c54421db080436033bf
2bf3e831cbf908d653fb585823f908d65bf3e831c4480caff421f114c43683769
2bf3fc6e63f5f5e093f941171bf5f5e09bf3fc6e64482200042293cfe438a8000
2bf9cc31e3fa2590e3fd1cc79bfa2590ebf9cc31e4486c4f7421a0a194357776e
2bf9fc680bf36b03b3faea6a53f36b03bbf9fc680448635a2421f28a7436745d4
2bfa53f50bde58db53fb5826a3de58db5bfa53f50446a6db042248739436e8c56
2bfbc2e5fbf8d2ddb3fd12e813f8d2ddbbfbc2e5f446e389042179d5f4342ee30
2bfbef0b7bf7ee8fb3ff24dfb3f7ee8fbbfbef0b74481ac90421970d4435909af
2bfcfd4513f259fae3fc905cabf259faebfcfd4514450f37341fe99c243121a93
2bfd4646abd5f09063fe1f1a73d5f0906bfd4646a448bfa3a42316f6b439036f2
2bfdc6401be2485e63ff55f543e2485e6bfdc64014478c17b42171ef243473758
2bfe4a8bcbebb37d73ff6e21b3ebb37d7bfe4a8bc444aa1904211782d433d4d36
2bff7b8c03ea453363fee8d91bea45336bff7b8c04454a22242196db843572bcd
33ea787b33f8a71853f8c8908bf8a71853ea787b3445728e04222ab2f43720000
3bf35edc7bf60e9243f8bbe593f60e924bf35edc744598d0c41fd5f6043100000
`.trim().split(/\s+/);
const originalKinds=new Map(identityCodes.map(code=>[code.slice(1),KINDS[Number(code[0])]]));
const COLD='overview:trail:trees',SHRUB='mystia-house:props:shrub:8:2',previous=G.buildRegion,adapted=new Map();
const leafMaterial=kind=>kind==='hinoki'?'trailNeedle':kind==='cherry'?'trailCherry':'trailLeaf';
const inside=(x,z)=>x>=ROI[0]&&x<=ROI[2]&&z>=ROI[1]&&z<=ROI[3];
function matrixKey(a,offset=0){const words=new Uint32Array(a.buffer,a.byteOffset+offset*4,16);if(ZERO_WORDS.some(k=>words[k]!==0)||words[15]!==0x3f800000)throw Error('Trail instance matrix layout changed');return AFFINE_WORDS.map(k=>words[k].toString(16).padStart(8,'0')).join('');}
function sourceKind(m){return m.id.split(':')[3]?.replace(/^garden-/,'');}
function originalKind(a,offset){const key=matrixKey(a,offset),kind=originalKinds.get(key);if(!kind)throw Error('Unknown original trail tree identity');return kind;}
function variant(kind,x,z){return (Math.floor(x/96)*31+Math.floor(z/96)*17+KINDS.indexOf(kind))&1;}
function byteSize(meshes){const seen=new Set();let n=0;for(const m of meshes)for(const k of ['vertices','farVertices','instances','instanceColors','index'])if(m[k]&&!seen.has(m[k].buffer)){seen.add(m[k].buffer);n+=m[k].buffer.byteLength;}return n;}
function prototype(kind,v,lod,publicKind=null){if(!G.TRAIL_PLANTS)throw Error('Trail tree prototypes missing');const base=kind==='shrub'?G.TRAIL_PLANTS.shrub(v,lod):G.TRAIL_PLANTS.tree(kind,v,lod);if(!publicKind)return base;
 const key=publicKind+':'+v+':'+lod;if(adapted.has(key))return adapted.get(key);
 const scale=publicKind==='broad'?[1.4,2,1.4]:publicKind==='pine'?[1.06,1.3,1.06]:[1.45,1.8,1.45],tint=G.rgb(publicKind==='pine'?'#526e4e':publicKind==='shrub'?'#5f7747':'#6b864e'),out={};
 for(const [part,source]of Object.entries(base)){const a=source.slice();for(let i=0;i<a.length;i+=9){for(let k=0;k<3;k++)a[i+k]*=scale[k];const n=G.norm([a[i+3]/scale[0],a[i+4]/scale[1],a[i+5]/scale[2]]);for(let k=0;k<3;k++){a[i+3+k]=n[k];if(part==='leaf')a[i+6+k]*=tint[k];}}out[part]=a;}
 adapted.set(key,out);return out;
}
function bounds(arrays,instances){const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];for(const a of arrays)for(let i=0;i<a.length;i+=9)for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],a[i+k]);hi[k]=Math.max(hi[k],a[i+k]);}const lower=[Infinity,Infinity,Infinity],upper=[-Infinity,-Infinity,-Infinity];for(let i=0;i<instances.length;i+=16){const matrix=instances.subarray(i,i+16);for(let corner=0;corner<8;corner++){const p=G.transform(matrix,[0,1,2].map(k=>corner&(1<<k)?hi[k]:lo[k]));for(let k=0;k<3;k++){lower[k]=Math.min(lower[k],p[k]);upper[k]=Math.max(upper[k],p[k]);}}}return{center:lower.map((n,k)=>(n+upper[k])*.5),radius:G.length(G.sub(upper,lower))*.5+.001};}
function append(bin,m,i){for(let k=0;k<16;k++)bin.matrices.push(m.instances[i+k]);for(let k=0;k<3;k++)bin.colors.push(m.instanceColors[i/16*3+k]);bin.sources.add(m.id);}
function binFor(bins,key,kind,v,template,publicKind=null){if(!bins.has(key))bins.set(key,{key,kind,v,template,publicKind,matrices:[],colors:[],sources:new Set()});return bins.get(key);}
function retained(m,keep){if(keep.length===m.instances.length/16)return m;if(!keep.length)return null;const matrices=new Float32Array(keep.length*16),colors=new Float32Array(keep.length*3);for(let j=0;j<keep.length;j++){matrices.set(m.instances.subarray(keep[j]*16,keep[j]*16+16),j*16);colors.set(m.instanceColors.subarray(keep[j]*3,keep[j]*3+3),j*3);}return{...m,instances:matrices,instanceColors:colors};}
function records(bins,prefix,cold=false){const out=[];for(const bin of bins.values()){const instances=new Float32Array(bin.matrices),colors=new Float32Array(bin.colors),near=prototype(bin.kind,bin.v,cold?'proxy':'near',bin.publicKind),far=cold?null:prototype(bin.kind,bin.v,'far',bin.publicKind),box=bounds([...Object.values(near),...(far?Object.values(far):[])],instances);
 for(const part of cold?['solid']:['wood','leaf']){const vertices=near[part];if(!vertices?.length)continue;const m={...bin.template,id:prefix+bin.key+':'+part,vertices,instances,instanceColors:colors,component:bin.publicKind?bin.template.component:bin.kind==='shrub'?'trail-landscape-shrub':'trail-landscape-tree',trailLandscape:true,trailPart:part,treeKind:bin.kind,trailPrototypeVariant:bin.v,trailSourceRecordIDs:[...bin.sources],basis:'P: existing plant identity, local crown/branch form',material:cold?'foliage':part==='wood'?'trailBark':leafMaterial(bin.kind),...box};delete m.index;delete m.farVertices;delete m.leafCards;
 if(!cold){m.farVertices=far[part];m.lodDistance=bin.publicKind?230:170;if(part==='leaf')m.leafCards=true;}if(bin.publicKind)m.trailPublicPrototype=bin.publicKind;out.push(m);}}
 return out;
}
function applyDetail(pack){if(pack.meta?.trailLandscape?.revision===1)return pack;const trees=new Map(),shrubs=new Map(),out=[];let selectedTrees=0,selectedShrubs=0,hasLegacy=false;
 for(const m of pack.meshes){const legacy=m.id.startsWith('trail:legacy:plants:'),shrub=m.id===SHRUB;if(!legacy&&!shrub){out.push(m);continue;}if(legacy)hasLegacy=true;const keep=[];
 for(let i=0;i<m.instances.length;i+=16){const x=m.instances[i+12],z=m.instances[i+14];if(!inside(x,z)){keep.push(i/16);continue;}const kind=shrub?'shrub':originalKind(m.instances,i);if(legacy&&sourceKind(m)!==kind)throw Error('Original trail species changed');const v=variant(kind,x,z),cell=Math.floor(x/96)+':'+Math.floor(z/96),key=kind+':'+cell+':'+v,bin=binFor(shrub?shrubs:trees,key,kind,v,m);append(bin,m,i);if(shrub)selectedShrubs++;else selectedTrees++;}
 const keepRecord=retained(m,keep);if(keepRecord)out.push(keepRecord);
 }
 if(selectedShrubs!==27||hasLegacy&&selectedTrees!==204)throw Error('Trail selected source population changed');out.push(...records(trees,'trail:landscape:native:tree:'),...records(shrubs,'trail:landscape:native:shrub:'));
 return{...pack,meshes:out,bytes:byteSize(out),meta:{...pack.meta,trailLandscape:{revision:1,selectedTrees,selectedShrubs,legacyPresent:hasLegacy,nativeTreeBins:trees.size,nativeShrubBins:shrubs.size,basis:'P: local tree/woodland forms; source matrices and RGB retained'}}};
}
function applyOverview(data,pack){if(pack.meta?.trailLandscape?.revision===1)return[];const cold=new Map(),publicBins=new Map(),out=[];let selectedCold=0,publicTrees=0,publicShrubs=0;
 for(const m of pack.meshes){const originalCold=m.id===COLD,publicKind=m.globalSurface&&m.component==='transition-vegetation'&&['broad','pine','shrub'].includes(m.id.split(':')[2])?m.id.split(':')[2]:null;if(!originalCold&&!publicKind){out.push(m);continue;}const keep=[];
 for(let i=0;i<m.instances.length;i+=16){const x=m.instances[i+12],z=m.instances[i+14];if(!inside(x,z)){keep.push(i/16);continue;}const kind=originalCold?originalKind(m.instances,i):publicKind==='broad'?'broadleaf':publicKind==='pine'?'hinoki':'shrub',v=variant(kind,x,z),key=kind+':'+v,bin=binFor(originalCold?cold:publicBins,key,kind,v,m,publicKind);append(bin,m,i);if(originalCold)selectedCold++;else if(kind==='shrub')publicShrubs++;else publicTrees++;}
 const keepRecord=retained(m,keep);if(keepRecord)out.push(keepRecord);
 }
 if(selectedCold!==204||publicTrees!==10||publicShrubs!==3)throw Error('Trail public source population changed');out.push(...records(cold,'trail:landscape:overview:tree:',true),...records(publicBins,'trail:landscape:public:'));
 pack.meshes=out;pack.meta={...pack.meta,trailLandscape:{revision:1,coldTrees:selectedCold,publicTrees,publicShrubs,coldBins:cold.size,publicBins:publicBins.size,basis:'P: local tree/woodland forms; source matrices and RGB retained'}};return[];
}
G.TRAIL_LANDSCAPE={revision:1,roi:ROI.slice(),coldId:COLD,shrubId:SHRUB,originalBuildRegion:previous,applyDetail,applyOverview,matrixKey,originalKind,variant,prototype,bounds,byteSize};
G.buildRegion=async function(data,id,legacy){const pack=await previous(data,id,legacy);return id==='trail'?applyDetail(pack):pack;};
G.extraOverviewBuilders=[...(G.extraOverviewBuilders||[]),applyOverview];
})(globalThis.GA);
