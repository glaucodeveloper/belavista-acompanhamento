import bpy

source = '/home/icarogdo/dev/WWW/alianca_park_masterplan_pdf_3d.glb'
target = '/home/icarogdo/dev/WWW/belavista-ai-monitor/assets/model/alianca_park_masterplan_preview.glb'

bpy.ops.import_scene.gltf(filepath=source)
triangles_before = 0
reduced_meshes = 0

for image in bpy.data.images:
    if image.size[0] > 1024 or image.size[1] > 1024:
        ratio = min(1024 / image.size[0], 1024 / image.size[1])
        image.scale(max(1, int(image.size[0] * ratio)), max(1, int(image.size[1] * ratio)))

for obj in list(bpy.context.scene.objects):
    if obj.type != 'MESH':
        continue
    triangles_before += len(obj.data.polygons)
    if len(obj.data.polygons) <= 80:
        continue
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    modifier = obj.modifiers.new(name='preview-decimate', type='DECIMATE')
    modifier.ratio = 0.07
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    obj.select_set(False)
    reduced_meshes += 1

triangles_after = sum(len(mesh.polygons) for mesh in bpy.data.meshes)
print(f'TRIS_BEFORE={triangles_before} TRIS_AFTER={triangles_after} MESHES_REDUCED={reduced_meshes}')
bpy.ops.export_scene.gltf(
    filepath=target,
    export_format='GLB',
    export_image_format='JPEG',
    export_jpeg_quality=72,
    export_texcoords=True,
    export_normals=True,
)
print(f'EXPORTED={target}')
