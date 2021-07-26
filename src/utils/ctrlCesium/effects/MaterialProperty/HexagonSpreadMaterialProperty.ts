// HexagonSpreadMaterialProperty
/* eslint-disable no-debugger */
// 六边形扩散效果
declare const Cesium: any

function HexagonSpreadMaterialProperty(ob: any) {
  this._definitionChanged = new Cesium.Event()
  this._color = undefined
  this._colorSubscription = undefined
  this.color = ob.color
  this.duration = Cesium.defaultValue(ob.duration, 1000)
  this._time = new Date().getTime()
}
Object.defineProperties(HexagonSpreadMaterialProperty.prototype, {
  isConstant: {
    get: function() {
      return false
    },
  },
  definitionChanged: {
    get: function() {
      return this._definitionChanged
    },
  },
  color: Cesium.createPropertyDescriptor('color'),
})
HexagonSpreadMaterialProperty.prototype.getType = function(_time: any) {
  return Cesium.Material.HexagonSpreadMaterialType
}
HexagonSpreadMaterialProperty.prototype.getValue = function(
  time: any,
  result: any
) {
  if (!Cesium.defined(result)) {
    result = {}
  }
  result.color = Cesium.Property.getValueOrClonedDefault(
    this._color,
    time,
    Cesium.Color.WHITE,
    result.color
  )
  result.image = Cesium.Material.HexagonSpreadMaterialImage
  result.time =
  ((new Date().getTime() - this._time) % this.duration) / this.duration
  return result
}
interface Other_tmp {
  _color: any
}
HexagonSpreadMaterialProperty.prototype.equals = function(other: Other_tmp) {
  const reData = (
    this === other ||
    (other instanceof HexagonSpreadMaterialProperty &&
      Cesium.Property.equals(this._color, other._color))
  )
  return reData
}
Cesium.HexagonSpreadMaterialProperty = HexagonSpreadMaterialProperty
Cesium.Material.HexagonSpreadMaterialType = 'HexagonSpreadMaterial'
Cesium.Material.HexagonSpreadMaterialImage = './hexagon.png'
Cesium.Material.HexagonSpreadSource = `
czm_material czm_getMaterial(czm_materialInput materialInput)
{
     czm_material material = czm_getDefaultMaterial(materialInput);
     vec2 st = materialInput.st;
     vec4 colorImage = texture2D(image,  vec2(st ));
     material.alpha = colorImage.a * color.a*0.5;
     material.diffuse =  1.8* color.rgb  ;
     return material;
 }
 `
Cesium.Material._materialCache.addMaterial(
  Cesium.Material.HexagonSpreadMaterialType,
  {
    fabric: {
      type: Cesium.Material.HexagonSpreadMaterialType,
      uniforms: {
        color: new Cesium.Color(1, 0, 0, 0.5),
        time: 1,
        image: Cesium.Material.HexagonSpreadMaterialImage,
      },
      source: Cesium.Material.HexagonSpreadSource,
    },
    translucent: function(material: any) {
      return true
    },
  }
)
function init() {
  console.log('HexagonSpreadMaterialProperty init')
}
export { HexagonSpreadMaterialProperty, init }