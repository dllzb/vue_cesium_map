/* eslint-disable no-debugger */

import { getTitlesetList, getOneTitleset } from '@/api/titleset'
import { colorRgb1 } from '@/utils/color'
class Titleset {
  viewer: any
  modalPrimitives: any
  curEleDatas: any
  curSourceShaders: any
  constructor(viewer: any) {
    this.viewer = viewer
    this.modalPrimitives = []
    this.curEleDatas = []
    this.curSourceShaders = []
  }
  effect_height_change(val: number) {
    const OneModal = this.modalPrimitives[0]
    if (!OneModal) {
      return null
    }
    this.curEleDatas[0].height = val
  }
  effect_color_change(color: string) {
    const OneModal = this.modalPrimitives[0]
    if (!OneModal) {
      return null
    }
    this.curEleDatas[0].effect_color = color
  }
  effectswitch_change(val: boolean) {
    const OneModal = this.modalPrimitives[0]
    if (!OneModal) {
      return null
    }
    this.curEleDatas[0].effectswitch = val ? 1 : 0
  }
  change_color(color: string) {
    const OneModal = this.modalPrimitives[0]
    if (OneModal) {
      OneModal.style = new Cesium.Cesium3DTileStyle({
        color: {
          conditions: [['true', `color('${color}')`]],
        },
      })
    }
  }
  setOneModalOff(ele: any) {
    const OneModal = this.modalPrimitives[0]
    if (OneModal) {
      this.update3dtilesMaxtrix(OneModal, ele)
    }
  }
  showConfigCom(ele: any) {
    this.curEleDatas = ele
    this.addOne3dTitleset(ele[0], 0, true)
  }
  async showOne(id: string): Promise<any> {
    const res: any = await getOneTitleset(id)
    this.curEleDatas = res.data
    if (res.data.length === 0 || !res.data[0].url) {
      return false
    }
    this.addOne3dTitleset(res.data[0], 0, true)
    return res.data[0]
  }
  async init() {
    const res: any = await getTitlesetList()
    const _this = this
    if (res.data) {
      _this.curEleDatas = res.data
      res.data.forEach((element, index: number) => {
        if (element.url) {
          _this.addOne3dTitleset(element, index)
        }
      })
    }
  }
  addOne3dTitleset(ele: any, index: number, isConfig = false) {
    const _this = this
    const modalOne = this.viewer.scene.primitives.add(
      new Cesium.Cesium3DTileset({
        url: ele.url,
        shadows: 4,
        maximumScreenSpaceError: 1, // Temporary workaround for low memory mobile devices - Increase maximum error to 8.
        maximumNumberOfLoadedTiles: 1000, // Temporary workaround for low memory mobile devices - Decrease (disable) tile cache.
        // debugShowBoundingVolume: true,
        // debugColorizeTiles: true,
        // debugShowUrl: true,
        // debugShowContentBoundingVolume: true,
        // debugShowViewerRequestVolume: true,
        // debugShowRenderingStatistics: true,
        // debugShowMemoryUsage: true,
      })
    )
    modalOne.readyPromise.then(function(tileset: any) {
      if (ele.flytoswitch === 1) {
        _this.viewer.zoomTo(tileset) // ?????????????????????????????????
      }
      // ????????? ??????3dtiles?????????????????????????????????????????????
      _this.update3dtilesMaxtrix(tileset, ele)

      // ?????????????????????
      tileset.style = new Cesium.Cesium3DTileStyle({
        color: {
          conditions: [['true', `color('${ele.color}')`]],
        }
      })

      // ???????????????????????????
      if (ele.effectswitch === 1 || isConfig) {
        _this.makeEffect(tileset, ele, index, isConfig)
      }
    })
    _this.modalPrimitives.push(modalOne)
  }
  tileVisible_addEventListener_fun(cesium3DTile: any) {
    const v_this: any = this as any
    const ele: any = v_this.curEleDatas[v_this.index]
    // ?????????????????????????????????
    const cesium3DTileCon: any = cesium3DTile.content
    const featuresLength: number = cesium3DTileCon.featuresLength
    const effect_color: any = colorRgb1(ele.effect_color)
    for (let i = 0; i < featuresLength; i += 2) {
      const _model = cesium3DTileCon.getFeature(i).content._model
      if (_model && _model._sourcePrograms && _model._rendererResources) {
        Object.getOwnPropertyNames(_model._sourcePrograms).forEach(function(
          i: any
        ) {
          const msp = _model._sourcePrograms[i]
          // ??????????????? ??????
          if (!v_this.curSourceShaders[v_this.index]) {
            v_this.curSourceShaders[v_this.index] = _model._rendererResources.sourceShaders[msp.fragmentShader]
          }
          if (ele.effectswitch !== 1) {
            _model._rendererResources.sourceShaders[msp.fragmentShader] = v_this.curSourceShaders[v_this.index]
          }
          else {
            _model._rendererResources.sourceShaders[msp.fragmentShader] = `
            varying vec3 v_positionEC;
            void main(void){
              vec4 position = czm_inverseModelView * vec4(v_positionEC,1); // ??????
              float glowRange = ${ele.height.toFixed(2)}; // ?????????????????????(??????)
              gl_FragColor = vec4(${effect_color[0]}, ${effect_color[1]}, ${effect_color[2]}, 1.0); // ??????
              // ?????? ???????????????????????????20%?????????????????????????????????
              if((position.z / 100.0) < 0.2) {
                gl_FragColor *= vec4(vec3(position.z / 100.0 * 2.0), 1.0);
              }else{
                gl_FragColor *= vec4(vec3(position.z / 100.0), 1.0); // ??????
              }
              // ????????????
              float time = fract(czm_frameNumber / 360.0);
              time = abs(time - 0.5) * 2.0;
              float diff = step(0.005, abs( clamp(position.z / glowRange, 0.0, 1.0) - time));
              gl_FragColor.rgb += gl_FragColor.rgb * (1.0 - diff);
            }
            `
          }
        })
        _model._shouldRegenerateShaders = ele.effectswitch === 1 || v_this.isConfig // ?????? true
      }
    }
  }
  makeEffect(tileset: any, ele: any, index: number, isConfig: boolean) {
    const _this = this
    tileset.tileVisible.addEventListener(
      _this.tileVisible_addEventListener_fun,
      { curEleDatas: _this.curEleDatas, ele: ele, index: index, curSourceShaders: _this.curSourceShaders, isConfig: isConfig }
    )
  }
  update3dtilesMaxtrix(tileset: any, ele: any) {
    if (!tileset.ready) {
      return
    }
    // ??????tileset???????????????????????????????????????????????????????????????
    const cartographic = Cesium.Cartographic.fromCartesian(
      tileset.boundingSphere.center
    )
    // ????????????????????????0??????????????????????????????
    const surface = Cesium.Cartesian3.fromRadians(
      cartographic.longitude,
      cartographic.latitude,
      cartographic.height
    )
    // ?????????????????????????????????????????????????????????????????????
    const offset = Cesium.Cartesian3.fromRadians(
      cartographic.longitude + Cesium.Math.toRadians(ele.offset_x), // ?????????????????????????????????
      cartographic.latitude + Cesium.Math.toRadians(ele.offset_y),
      cartographic.height + ele.offset_z // ??????????????? ????????????
    )
    // ????????????????????????????????????????????????
    const translation = Cesium.Cartesian3.subtract(
      offset,
      surface,
      new Cesium.Cartesian3()
    )
    // ??????3dtiles??????
    tileset.modelMatrix = Cesium.Matrix4.fromTranslation(translation)
  }
  move3dtilesMaxtrix(tileset: any) {
    // xyz ?????????  lat lon ??????   ??? lat lon ????????? ???
    // ??????tileset???????????????????????????????????????????????????????????????
    const cartographic = Cesium.Cartographic.fromCartesian(
      tileset.boundingSphere.center
    )
    // ????????????????????????0??????????????????????????????
    const surface = Cesium.Cartesian3.fromRadians(
      cartographic.longitude,
      cartographic.latitude,
      0 // cartographic.height
    )
    // ?????????????????????????????????????????????????????????????????????
    const offset = Cesium.Cartesian3.fromRadians(
      cartographic.longitude, // + Cesium.Math.toRadians(0.0001), ?????????????????????????????????
      cartographic.latitude,
      -500 // ??????????????? ???????????? ??????500???
    )
    offset.x += 100 // ?????????????????? ?????? ????????????
    // const offset = Cesium.Cartesian3.fromDegrees(
    //   tileset.boundingSphere.center.x + 10,
    //   tileset.boundingSphere.center.y,
    //   0.0
    // )
    // ????????????????????????????????????????????????
    const translation = Cesium.Cartesian3.subtract(
      offset,
      surface,
      new Cesium.Cartesian3()
    )
    // ??????3dtiles??????
    tileset.modelMatrix = Cesium.Matrix4.fromTranslation(translation)
  }
  addtest() {
    const _this = this
    this.viewer.scene.primitives
      .add(
        new Cesium.Cesium3DTileset({
          url: 'http://myhome.217dan.com:8081/chengdu_all/tileset.json',
        })
      )
      .readyPromise.then(function(tileset: any) {
        setTimeout(() => {
          _this.viewer.zoomTo(tileset) // ?????????????????????
        }, 2000)

        // ????????? ??????3dtiles?????????????????????????????????????????????
        _this.move3dtilesMaxtrix(tileset)
        // ??????????????????????????????
        tileset.style = new Cesium.Cesium3DTileStyle({
          color: {
            conditions: [['true', "color('rgba(255,255,255,0.9)')"]],
          },
        })
        tileset.tileVisible.addEventListener(function(cesium3DTile: any) {
          // ?????????????????????????????????
          const cesium3DTileCon: any = cesium3DTile.content
          const featuresLength: number = cesium3DTileCon.featuresLength
          for (let i = 0; i < featuresLength; i += 2) {
            const _model = cesium3DTileCon.getFeature(i).content._model
            if (_model && _model._sourcePrograms && _model._rendererResources) {
              Object.getOwnPropertyNames(_model._sourcePrograms).forEach(
                function(i: any) {
                  const msp = _model._sourcePrograms[i]
                  _model._rendererResources.sourceShaders[
                    msp.fragmentShader
                  ] = `
                varying vec3 v_positionEC;
                void main(void){
                  vec4 position = czm_inverseModelView * vec4(v_positionEC,1); // ??????
                  float glowRange = 100.0; // ?????????????????????(??????)
                  gl_FragColor = vec4(0.2,  0.5, 1.0, 1.0); // ??????
                  gl_FragColor *= vec4(vec3(position.z / 100.0), 1.0); // ??????
                  // ????????????
                  float time = fract(czm_frameNumber / 360.0);
                  time = abs(time - 0.5) * 2.0;
                  float diff = step(0.005, abs( clamp(position.z / glowRange, 0.0, 1.0) - time));
                  gl_FragColor.rgb += gl_FragColor.rgb * (1.0 - diff);
                }
                `
                }
              )
              _model._shouldRegenerateShaders = true // ??????
            }
          }
        })
      })

    // const x = -2394510.2078150916
    // const y = 5395360.292764892
    // const z = 2420140.372624237

    // // ????????????????????? xyz ??? ????????????
    // const ellipsoid = this.viewer.scene.globe.ellipsoid
    // const cartesian3 = new Cesium.Cartesian3(x, y, z)
    // const cartographic = ellipsoid.cartesianToCartographic(cartesian3)
    // const lat = Cesium.Math.toDegrees(cartographic.latitude)
    // const lng = Cesium.Math.toDegrees(cartographic.longitude)
    // const alt = cartographic.height

    // // ????????? ????????? ??? ????????????xyz
    // const ellipsoidz = this.viewer.scene.globe.ellipsoid
    // const cartographicz = Cesium.Cartographic.fromDegrees(lng, lat, alt)
    // const cartesianXYZ = ellipsoidz.cartographicToCartesian(cartographicz)

    // this.viewer.scene.camera.flyTo({
    //   // setView
    //   destination: {
    //     x: cartesianXYZ.x,
    //     y: cartesianXYZ.y,
    //     z: cartesianXYZ.z,
    //   },
    //   orientation: {
    //     direction: new Cesium.Cartesian3(
    //       0.41752728100630826,
    //       -0.6312054016802423,
    //       0.6536441772900325
    //     ),
    //     up: new Cesium.Cartesian3(
    //       -0.21208294240644568,
    //       0.6311630077718327,
    //       0.7460925432951585
    //     ),
    //   },
    //   duration: 1, // ????????????
    // })
  }
  add(inParam: any) {
    console.log(inParam)
    // const url = 'http://data.marsgis.cn/3dtiles/jzw-chengdu-gcj/tileset.json' // ??????
    // const url = 'http://211.149.185.229:8081/data/buildmapping/tileset.json' // ??????
    const url =
      'https://lab.earthsdk.com/model/702aa950d03c11e99f7ddd77cbe22fea/tileset.json' // ??????
    const tiles = new Cesium.Cesium3DTileset({
      url: url, // ?????????????????????
    })
    this.modalPrimitives = this.viewer.scene.primitives.add(tiles)
    this.viewer.scene.camera.setView({
      destination: {
        // x: -2393550.3357974524,
        // y: 5386606.88313247,
        // z: 2429438.0059398483,
        x: -2395783.5309640486,
        y: 5392694.777928539,
        z: 2424816.601754499,
      },
      orientation: {
        heading: 0.42631000693466764,
        pitch: -0.8022459306450823,
        roll: 0.4179249271708612,
      },
      duration: 1,
    })
    // tiles.readyPromise.then(function(tileset) {
    //   tiles.show = false
    //   var handler = new Cesium.ScreenSpaceEventHandler(CtrlTileset.Gmap.viewer.scene.canvas)
    //   handler.setInputAction(function(wheelment) {
    //     var height = CtrlTileset.Gmap.viewer.camera.positionCartographic.height
    //     // console.log('????????????????????????:' + height)
    //     if (height < 15000) {
    //       tiles.show = true
    //     } else {
    //       tiles.show = false
    //     }
    //   }, Cesium.ScreenSpaceEventType.WHEEL)
    // })
  }
}

export default Titleset
