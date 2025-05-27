/**
 * 前端脚本：处理图片上传和查询的交互
 */

const API_BASE_URL = 'https://picworker.10110531.xyz'; // 后端 API 基础地址

document.addEventListener('DOMContentLoaded', () => {
    const uploadForm = document.getElementById('uploadForm');
    const imageFile = document.getElementById('imageFile');
    const uploadResult = document.getElementById('uploadResult');
    const imageGallery = document.getElementById('imageGallery');
    const originalImage = document.getElementById('originalImage');
    const transformedImage = document.getElementById('transformedImage');
    const effectButtons = document.querySelectorAll('.effect-button');
    const effectSelects = document.querySelectorAll('.effect-select');
    const effectSliders = document.querySelectorAll('.effect-slider');
    const confirmButton = document.getElementById('confirmButton');
    const saveButton = document.getElementById('saveButton'); // 获取 Save 按钮
    const resetButton = document.getElementById('resetButton'); // 获取 Reset 按钮

    // 新增的DOM元素
    const artFilterSelect = document.getElementById('artFilterSelect');
    const opacityInput = document.getElementById('opacityInput');
    const opacityValueSpan = document.getElementById('opacityValue');
    const replaceColorFromInput = document.getElementById('replaceColorFrom');
    const replaceColorToInput = document.getElementById('replaceColorTo');
    const replaceColorToleranceInput = document.getElementById('replaceColorTolerance');
    const formatSelect = document.getElementById('formatSelect');
    const cropWidthInput = document.getElementById('cropWidth');
    const cropHeightInput = document.getElementById('cropHeight');
    const cropModeSelect = document.getElementById('cropModeSelect');
    const qualityInput = document.getElementById('qualityInput');
    const qualityValueSpan = document.getElementById('qualityValue');
    const qualityAutoToggle = document.getElementById('qualityAutoToggle');
    const dprInput = document.getElementById('dprInput');
    const dprAutoToggle = document.getElementById('dprAutoToggle');
    const deleteSelectedImageButton = document.getElementById('deleteSelectedImageButton'); // 获取删除按钮

    // 新增的图片详情DOM元素
    const detailImage = document.getElementById('detailImage');
    const detailPublicId = document.getElementById('detailPublicId');
    const detailImageUrl = document.getElementById('detailImageUrl'); // 新增的URL显示元素

    // 新增的重力设置DOM元素
    const cropGravitySelect = document.getElementById('cropGravitySelect');

    // 新增的颜色调整DOM元素
    const brightnessInput = document.getElementById('brightnessInput');
    const brightnessValueSpan = document.getElementById('brightnessValue');
    const contrastInput = document.getElementById('contrastInput');
    const contrastValueSpan = document.getElementById('contrastValue');
    const saturationInput = document.getElementById('saturationInput');
    const saturationValueSpan = document.getElementById('saturationValue');
    const fillLightLevelInput = document.getElementById('fillLightLevelInput'); // 新增
    const fillLightLevelValueSpan = document.getElementById('fillLightLevelValue'); // 新增
    const fillLightBlendInput = document.getElementById('fillLightBlendInput'); // 新增
    const fillLightBlendValueSpan = document.getElementById('fillLightBlendValue'); // 新增
    // const tintColorInput = document.getElementById('tintColorInput'); // 已删除
    // const applyTintButton = document.getElementById('applyTintButton'); // 已删除

    // 新增的模糊与像素化DOM元素
    const blurInput = document.getElementById('blurInput');
    const blurValueSpan = document.getElementById('blurValue');
    const pixelateInput = document.getElementById('pixelateInput');
    const pixelateValueSpan = document.getElementById('pixelateValue');
    const blurFacesButton = document.getElementById('blurFacesButton');
    const pixelateFacesButton = document.getElementById('pixelateFacesButton');

    // 新增的文本叠加DOM元素 (已删除)
    // const overlayTextInput = document.getElementById('overlayTextInput');
    // const overlayFontSelect = document.getElementById('overlayFontSelect');
    // const overlayFontSizeInput = document.getElementById('overlayFontSizeInput');
    // const overlayFontColorInput = document.getElementById('overlayFontColorInput');
    // const overlayGravitySelect = document.getElementById('overlayGravitySelect');
    // const overlayOffsetXInput = document.getElementById('overlayOffsetXInput');
    // const overlayOffsetYInput = document.getElementById('overlayOffsetYInput');
    // const applyTextOverlayButton = document.getElementById('applyTextOverlayButton');

    // 新增的文件夹相关DOM元素
    const uploadFolderInput = document.getElementById('uploadFolderInput');
    const currentFolderDisplay = document.getElementById('currentFolderDisplay');
    const folderInput = document.getElementById('folderInput');
    const goToFolderButton = document.getElementById('goToFolderButton');
    const uploadTagsInput = document.getElementById('uploadTagsInput'); // 获取标签输入框
    const searchTagInput = document.getElementById('searchTagInput'); // 获取标签搜索输入框
    const searchByTagButton = document.getElementById('searchByTagButton'); // 获取按标签搜索按钮
    const clearTagSearchButton = document.getElementById('clearTagSearchButton'); // 获取清除标签搜索按钮

    let selectedPublicId = null; // 用于存储当前选中的图片 public_id
    let originalImageUrl = null; // 用于存储当前选中图片的原图 URL
    let currentTransformations = {}; // 用于存储当前应用的所有转换效果及其参数
    let currentFolder = ''; // 当前显示的文件夹，默认为空，表示所有上传图片

    /**
     * 重置所有效果输入控件到默认状态
     * @returns {void}
     */
    function resetAllControls() {
        effectButtons.forEach(btn => btn.classList.remove('active'));
        effectSelects.forEach(select => select.value = '');
        effectSliders.forEach(slider => {
            if (slider.id === 'opacityInput') slider.value = '100';
            if (slider.id === 'qualityInput') slider.value = '80';
            slider.dispatchEvent(new Event('input')); // 触发 input 事件更新显示值
        });

        // 重置特定输入框和复选框
        replaceColorFromInput.value = '';
        replaceColorToInput.value = '';
        replaceColorToleranceInput.value = '';
        cropWidthInput.value = '';
        cropHeightInput.value = '';
        cropGravitySelect.value = ''; // 重置重力选择
        dprInput.value = '';
        qualityAutoToggle.checked = false;
        dprAutoToggle.checked = false;

        // 重置颜色调整
        brightnessInput.value = '0';
        brightnessValueSpan.textContent = '0';
        contrastInput.value = '0';
        contrastValueSpan.textContent = '0';
        saturationInput.value = '0';
        saturationValueSpan.textContent = '0';
        fillLightLevelInput.value = '0'; // 新增
        fillLightLevelValueSpan.textContent = '0'; // 新增
        fillLightBlendInput.value = '0'; // 新增
        fillLightBlendValueSpan.textContent = '0'; // 新增
        // tintColorInput.value = '#FFFFFF'; // 已删除
        delete currentTransformations['e_tint']; // 确保色调效果也被清除

        // 重置模糊与像素化
        blurInput.value = '0';
        blurValueSpan.textContent = '0';
        pixelateInput.value = '0';
        pixelateValueSpan.textContent = '0';
        // 确保人脸模糊/像素化效果也被清除
        delete currentTransformations['e_blur_faces'];
        delete currentTransformations['e_pixelate_faces'];

        // 重置文本叠加 (已删除)
        // overlayTextInput.value = '';
        // overlayFontSelect.value = 'arial';
        // overlayFontSizeInput.value = '30';
        // overlayFontColorInput.value = '#FFFFFF';
        // overlayGravitySelect.value = 'north_west';
        // overlayOffsetXInput.value = '0';
        // overlayOffsetYInput.value = '0';
        // 确保文本叠加效果也被清除
        delete currentTransformations['l']; // 键名已改为 'l'

        currentTransformations = {}; // 清空所有转换
        transformedImage.src = originalImageUrl; // 显示原图
        transformedImage.classList.remove('hidden');
    }

    /**
     * 从后端获取图片列表并显示在画廊中
     * @param {string} [folder] - 要获取图片的文件夹名称 (可选)。如果为空，则获取所有上传图片。
     * @param {string} [tag] - 可选的标签，用于过滤图片
     * @returns {Promise<void>}
     */
    async function fetchAndDisplayImages(folder = '', tag = '') {
        currentFolder = folder; // 更新当前文件夹
        currentFolderDisplay.textContent = folder ? `/${folder}` : '所有上传图片'; // 更新显示

        imageGallery.innerHTML = '<p>加载图片中...</p>';
        try {
            let url = `/api/images?folder=${encodeURIComponent(folder)}`;
            if (tag) {
                url += `&tag=${encodeURIComponent(tag)}`;
            }
            const response = await fetch(`${API_BASE_URL}${url}`);
            const images = await response.json();

            if (response.ok) {
                if (images.length === 0) {
                    imageGallery.innerHTML = '<p>暂无图片，请先上传。</p>';
                } else {
                    imageGallery.innerHTML = ''; // 清空加载提示
                    images.forEach(image => {
                        const imgElement = document.createElement('img');
                        imgElement.src = image.secure_url;
                        imgElement.alt = image.public_id;
                        imgElement.dataset.publicId = image.public_id; // 存储 public_id
                        imgElement.dataset.secureUrl = image.secure_url; // 存储 secure_url
                        imgElement.classList.add('gallery-image'); // 添加样式类

                        // 为图片添加点击事件监听器，以便在点击时将图片的 public_id 传递给图片编辑区域和详情区域
                        imgElement.addEventListener('click', () => {
                            selectedPublicId = image.public_id;
                            originalImageUrl = image.secure_url;

                            // 显示在图片编辑区域
                            originalImage.src = originalImageUrl;
                            originalImage.classList.remove('hidden');
                            resetAllControls(); // 选择新图片时重置所有效果

                            // 显示在图片详情区域
                            detailImage.src = originalImageUrl;
                            detailImage.classList.remove('hidden');
                            detailPublicId.textContent = selectedPublicId;
                            detailImageUrl.href = originalImageUrl; // 设置链接的 href
                            detailImageUrl.textContent = originalImageUrl; // 设置链接的文本
                        });
                        imageGallery.appendChild(imgElement);
                    });
                }
            } else {
                imageGallery.innerHTML = `<p style="color: red;">获取图片失败: ${images.error || '未知错误'}</p>`;
                console.error('获取图片失败详情:', images);
            }
        } catch (error) {
            imageGallery.innerHTML = `<p style="color: red;">获取图片过程中发生错误: ${error.message}</p>`;
            console.error('获取图片错误:', error);
        }
    }

    // 处理图片上传表单提交
    uploadForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // 阻止表单默认提交

        const file = imageFile.files[0];
        if (!file) {
            uploadResult.innerHTML = '<p style="color: red;">请选择一个图片文件。</p>';
            return;
        }

        const formData = new FormData();
        formData.append('image', file);
        const folderToUpload = uploadFolderInput.value.trim();
        if (folderToUpload) {
            formData.append('folder', folderToUpload);
        }

        const tagsToUpload = uploadTagsInput.value.trim();
        if (tagsToUpload) {
            formData.append('tags', tagsToUpload); // 添加标签到 FormData
        }

        uploadResult.innerHTML = '<p>正在上传...</p>';

        try {
            const response = await fetch(`${API_BASE_URL}/api/upload`, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (response.ok) {
                uploadResult.innerHTML = `
                    <p style="color: green;">上传成功！</p>
                    <p>Public ID: ${result.public_id}</p>
                    <p>Secure URL: <a href="${result.secure_url}" target="_blank">${result.secure_url}</a></p>
                `; // 简化显示，只显示 Public ID 和 URL
                fetchAndDisplayImages(currentFolder); // 上传成功后刷新当前文件夹的画廊
            } else {
                uploadResult.innerHTML = `<p style="color: red;">上传失败: ${result.error || '未知错误'}</p>`;
                console.error('上传失败详情:', result);
            }

        } catch (error) {
            uploadResult.innerHTML = `<p style="color: red;">上传过程中发生错误: ${error.message}</p>`;
            console.error('上传错误:', error);
        }
    });

    /**
     * 应用图片转换效果
     * @param {string} publicId - 图片的 public_id
     * @param {object} transformations - 包含所有转换效果和参数的对象
     * @returns {Promise<void>}
     */
    async function applyTransformations(publicId, transformations) {
        if (!publicId) {
            alert('请先从画廊中选择一张图片进行编辑。');
            return;
        }

        // 如果没有应用任何转换，则显示原图
        if (Object.keys(transformations).length === 0) {
            transformedImage.src = originalImageUrl;
            transformedImage.classList.remove('hidden');
            return;
        }

        try {
            const queryString = new URLSearchParams({
                public_id: publicId,
                transformations: JSON.stringify(transformations) // 将转换对象转换为JSON字符串
            }).toString();

            const response = await fetch(`${API_BASE_URL}/api/transform?${queryString}`);
            const result = await response.json();

            if (response.ok) {
                transformedImage.src = result.transformed_url;
                transformedImage.classList.remove('hidden');
            } else {
                alert(`转换失败: ${result.error || '未知错误'}`);
                console.error('转换失败详情:', result);
            }
        } catch (error) {
            alert(`转换过程中发生错误: ${error.message}`);
            console.error('转换错误:', error);
        }
    }

    // 处理 Enhancements 和 Artistic Effects 按钮点击
    effectButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (!selectedPublicId) {
                alert('请先从画廊中选择一张图片进行编辑。');
                return;
            }

            // 移除所有 effect-button 的 active 状态
            effectButtons.forEach(btn => btn.classList.remove('active'));
            // 为当前点击的按钮添加 active 状态
            button.classList.add('active');

            const effectType = button.dataset.effect;

            // 如果是 'none' 效果，则清空所有转换
            if (effectType === 'none') {
                currentTransformations = {};
            } else if (effectType === 'replace_color') {
                // 替换颜色有自己的处理逻辑，不直接添加到 currentTransformations
                // 而是通过 confirmButton 触发时收集
                return;
            } else if (effectType === 'crop_resize') {
                // 裁剪/调整大小有自己的处理逻辑
                return;
            } else if (effectType === 'dpr') {
                // DPR有自己的处理逻辑
                return;
            } else {
                // 对于其他单选效果，只保留当前点击的效果
                currentTransformations = { [effectType]: {} };
            }
            applyTransformations(selectedPublicId, currentTransformations);
        });
    });

    // 艺术滤镜下拉菜单
    artFilterSelect.addEventListener('change', () => {
        if (!selectedPublicId) {
            alert('请先从画廊中选择一张图片进行编辑。');
            return;
        }
        const filterName = artFilterSelect.value;
        if (filterName) {
            currentTransformations['e_art'] = { filter: filterName };
        } else {
            delete currentTransformations['e_art']; // 如果选择空，则移除该效果
        }
        applyTransformations(selectedPublicId, currentTransformations);
    });

    // 不透明度滑块
    opacityInput.addEventListener('input', () => {
        if (!selectedPublicId) {
            // 如果没有选中图片，则静默返回，不弹出提示 (程序化触发)
            return;
        }
        const opacity = opacityInput.value;
        opacityValueSpan.textContent = opacity;
        currentTransformations['o'] = { level: opacity };
        applyTransformations(selectedPublicId, currentTransformations);
    });

    // 替换颜色按钮
    document.querySelector('button[data-effect="replace_color"]').addEventListener('click', () => {
        if (!selectedPublicId) {
            alert('请先从画廊中选择一张图片进行编辑。');
            return;
        }
        const fromColor = replaceColorFromInput.value;
        const toColor = replaceColorToInput.value;
        const tolerance = replaceColorToleranceInput.value;

        if (!fromColor || !toColor) {
            alert('请输入原色和目标色。');
            return;
        }

        const params = { to_color: toColor, from_color: fromColor };
        if (tolerance) {
            params.tolerance = tolerance;
        }
        currentTransformations['e_replace_color'] = params;
        applyTransformations(selectedPublicId, currentTransformations);
    });

    // 矢量化按钮
    document.querySelector('button[data-effect="vectorize"]').addEventListener('click', () => {
        if (!selectedPublicId) {
            alert('请先从画廊中选择一张图片进行编辑。');
            return;
        }
        // 矢量化目前不接受前端参数，直接应用
        currentTransformations['e_vectorize'] = {};
        applyTransformations(selectedPublicId, currentTransformations);
    });

    // 格式转换下拉菜单
    formatSelect.addEventListener('change', () => {
        if (!selectedPublicId) {
            alert('请先从画廊中选择一张图片进行编辑。');
            return;
        }
        const format = formatSelect.value;
        if (format) {
            currentTransformations['f'] = { format: format };
        } else {
            delete currentTransformations['f'];
        }
        applyTransformations(selectedPublicId, currentTransformations);
    });

    // 裁剪/调整大小按钮
    document.querySelector('button[data-effect="crop_resize"]').addEventListener('click', () => {
        if (!selectedPublicId) {
            alert('请先从画廊中选择一张图片进行编辑。');
            return;
        }
        const width = cropWidthInput.value;
        const height = cropHeightInput.value;
        const cropMode = cropModeSelect.value;
        const cropGravity = cropGravitySelect.value; // 获取重力选择的值

        if (!width && !height) {
            alert('请输入宽度或高度。');
            return;
        }
        if (!cropMode) {
            alert('请选择裁剪模式。');
            return;
        }

        const params = { crop_mode: cropMode };
        if (width) params.width = width;
        if (height) params.height = height;
        if (cropGravity) params.gravity = cropGravity; // 添加重力参数

        currentTransformations['c'] = params;
        applyTransformations(selectedPublicId, currentTransformations);
    });

    // 颜色调整滑块事件
    [brightnessInput, contrastInput, saturationInput].forEach(input => {
        input.addEventListener('input', () => {
            if (!selectedPublicId) { alert('请先选择图片'); return; }
            const effectType = input.id.replace('Input', ''); // brightness, contrast, saturation
            const value = input.value;
            document.getElementById(`${effectType}Value`).textContent = value;
            if (value !== '0') {
                currentTransformations[`e_${effectType}`] = { level: value };
            } else {
                delete currentTransformations[`e_${effectType}`];
            }
            applyTransformations(selectedPublicId, currentTransformations);
        });
    });

    // 补光强度滑块
    fillLightLevelInput.addEventListener('input', updateFillLight);
    // 补光混合滑块
    fillLightBlendInput.addEventListener('input', updateFillLight);

    /**
     * 更新补光效果的转换参数并应用
     * @returns {void}
     */
    function updateFillLight() {
        if (!selectedPublicId) { alert('请先选择图片'); return; }

        const level = fillLightLevelInput.value;
        const blend = fillLightBlendInput.value;

        fillLightLevelValueSpan.textContent = level;
        fillLightBlendValueSpan.textContent = blend;

        // 只有当 level 或 blend 不为 0 时才应用 e_fill_light
        if (level !== '0' || blend !== '0') {
            currentTransformations['e_fill_light'] = { level: level };
            if (blend !== '0') {
                currentTransformations['e_fill_light'].blend = blend;
            } else {
                // 如果 blend 为 0，确保不发送 blend 参数
                delete currentTransformations['e_fill_light'].blend;
            }
        } else {
            // 如果 level 和 blend 都为 0，则移除 e_fill_light 转换
            delete currentTransformations['e_fill_light'];
        }
        applyTransformations(selectedPublicId, currentTransformations);
    }

    // 颜色调整滑块事件
    [brightnessInput, contrastInput, saturationInput].forEach(input => {
        input.addEventListener('input', () => {
            if (!selectedPublicId) { alert('请先选择图片'); return; }
            const effectType = input.id.replace('Input', ''); // brightness, contrast, saturation
            const value = input.value;
            document.getElementById(`${effectType}Value`).textContent = value;
            if (value !== '0') {
                currentTransformations[`e_${effectType}`] = { level: value };
            } else {
                delete currentTransformations[`e_${effectType}`];
            }
            applyTransformations(selectedPublicId, currentTransformations);
        });
    });

    // 模糊/像素化滑块事件
    blurInput.addEventListener('input', () => {
        if (!selectedPublicId) { alert('请先选择图片'); return; }
        const value = blurInput.value;
        blurValueSpan.textContent = value;
        if (value !== '0') {
            currentTransformations['e_blur'] = { strength: value };
        } else {
            delete currentTransformations['e_blur'];
        }
        applyTransformations(selectedPublicId, currentTransformations);
    });

    pixelateInput.addEventListener('input', () => {
        if (!selectedPublicId) { alert('请先选择图片'); return; }
        const value = pixelateInput.value;
        pixelateValueSpan.textContent = value;
        if (value !== '0') {
            currentTransformations['e_pixelate'] = { strength: value };
        } else {
            delete currentTransformations['e_pixelate'];
        }
        applyTransformations(selectedPublicId, currentTransformations);
    });

    // 人脸模糊/像素化按钮事件 (切换逻辑)
    blurFacesButton.addEventListener('click', () => {
        if (!selectedPublicId) { alert('请先选择图片'); return; }
        if (currentTransformations['e_blur_faces']) {
            delete currentTransformations['e_blur_faces']; // 如果已存在，则撤销
        } else {
            currentTransformations['e_blur_faces'] = {}; // 否则应用
        }
        applyTransformations(selectedPublicId, currentTransformations);
    });
    pixelateFacesButton.addEventListener('click', () => {
        if (!selectedPublicId) { alert('请先选择图片'); return; }
        if (currentTransformations['e_pixelate_faces']) {
            delete currentTransformations['e_pixelate_faces']; // 如果已存在，则撤销
        } else {
            currentTransformations['e_pixelate_faces'] = {}; // 否则应用
        }
        applyTransformations(selectedPublicId, currentTransformations);
    });

    // 质量滑块和自动质量切换
    qualityInput.addEventListener('input', () => {
        console.log('Checking selectedPublicId in qualityInput input. Current value:', selectedPublicId);
        if (!selectedPublicId) {
            // 如果没有选中图片，则静默返回，不弹出提示 (程序化触发)
            return;
        }
        const quality = qualityInput.value;
        qualityValueSpan.textContent = quality;
        qualityAutoToggle.checked = false; // 手动调整质量时取消自动质量
        currentTransformations['q'] = { level: quality };
        applyTransformations(selectedPublicId, currentTransformations);
    });

    qualityAutoToggle.addEventListener('change', () => {
        if (!selectedPublicId) {
            alert('请先从画廊中选择一张图片进行编辑。');
            return;
        }
        if (qualityAutoToggle.checked) {
            currentTransformations['q'] = { level: 'auto' };
        } else {
            currentTransformations['q'] = { level: qualityInput.value }; // 恢复到滑块值
        }
        applyTransformations(selectedPublicId, currentTransformations);
    });

    // DPR 输入框和自动DPR切换
    document.querySelector('button[data-effect="dpr"]').addEventListener('click', () => {
        if (!selectedPublicId) {
            alert('请先从画廊中选择一张图片进行编辑。');
            return;
        }
        const dpr = dprInput.value;
        if (dprAutoToggle.checked) {
            currentTransformations['dpr'] = { value: 'auto' };
        } else if (dpr) {
            currentTransformations['dpr'] = { value: dpr };
        } else {
            delete currentTransformations['dpr'];
        }
        applyTransformations(selectedPublicId, currentTransformations);
    });

    dprAutoToggle.addEventListener('change', () => {
        if (!selectedPublicId) {
            alert('请先从画廊中选择一张图片进行编辑。');
            return;
        }
        if (dprAutoToggle.checked) {
            currentTransformations['dpr'] = { value: 'auto' };
            dprInput.value = ''; // 自动DPR时清空手动输入
        } else if (dprInput.value) {
            currentTransformations['dpr'] = { value: dprInput.value };
        } else {
            delete currentTransformations['dpr'];
        }
        applyTransformations(selectedPublicId, currentTransformations);
    });

    // Confirm 按钮现在触发所有当前转换
    confirmButton.addEventListener('click', () => {
        if (!selectedPublicId) {
            alert('请先从画廊中选择一张图片进行编辑。');
            return;
        }
        applyTransformations(selectedPublicId, currentTransformations);
    });

    /**
     * 保存转换后的图片到 Cloudinary
     * @returns {Promise<void>}
     */
    async function saveTransformedImage() {
        if (!selectedPublicId) {
            alert('请先从画廊中选择一张图片进行编辑。');
            return;
        }
        if (transformedImage.classList.contains('hidden') || !transformedImage.src) {
            alert('没有转换后的图片可以保存。请先应用转换。');
            return;
        }

        const imageUrl = transformedImage.src;

        try {
            const response = await fetch(`${API_BASE_URL}/api/save-transformed-image`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ imageUrl: imageUrl, folder: currentFolder }) // 添加 folder 参数
            });

            const result = await response.json();

            if (response.ok) {
                alert('转换后图片已成功保存到 Cloudinary！');
                fetchAndDisplayImages(currentFolder); // 保存成功后刷新当前文件夹的画廊
            } else {
                alert(`保存失败: ${result.error || '未知错误'}`);
                console.error('保存失败详情:', result);
            }
        } catch (error) {
            alert(`保存过程中发生错误: ${error.message}`);
            console.error('保存错误:', error);
        }
    }

    // Save 按钮事件监听器
    saveButton.addEventListener('click', saveTransformedImage);

    /**
     * 删除选中的图片
     * @returns {Promise<void>}
     */
    async function deleteSelectedImage() {
        console.log('deleteSelectedImage called. selectedPublicId:', selectedPublicId);
        if (!selectedPublicId) {
            alert('请先从画廊中选择一张图片进行删除。');
            return;
        }

        if (!confirm('确定要删除这张图片吗？此操作不可逆！')) {
            return; // 用户取消删除
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/delete-image?public_id=${encodeURIComponent(selectedPublicId)}`, {
                method: 'DELETE'
            });

            const result = await response.json();

            if (response.ok) {
                alert('图片已成功删除！');
                selectedPublicId = null; // 清空选中状态
                originalImageUrl = null;
                originalImage.src = '';
                originalImage.classList.add('hidden');
                transformedImage.src = '';
                transformedImage.classList.add('hidden');
                resetAllControls(); // 重置所有控件
                fetchAndDisplayImages(currentFolder); // 刷新当前文件夹的画廊
            } else {
                alert(`删除失败: ${result.error || '未知错误'}`);
                console.error('删除失败详情:', result);
            }
        } catch (error) {
            alert(`删除过程中发生错误: ${error.message}`);
            console.error('删除错误:', error);
        }
    }

    // Reset All Effects 按钮
    resetButton.addEventListener('click', () => {
        if (!selectedPublicId) {
            alert('请先从画廊中选择一张图片进行编辑。');
            return;
        }
        resetAllControls();
        applyTransformations(selectedPublicId, currentTransformations); // 应用空转换，显示原图
    });

    // 删除选中图片按钮事件监听器
    deleteSelectedImageButton.addEventListener('click', (event) => {
        event.stopPropagation(); // 阻止事件冒泡
        deleteSelectedImage();
    });


    // 跳转文件夹按钮事件监听器
    goToFolderButton.addEventListener('click', () => {
        const newFolder = folderInput.value.trim();
        // 如果输入了文件夹名，则按文件夹搜索；否则，显示所有上传图片
        fetchAndDisplayImages(newFolder);
        folderInput.value = ''; // 清空输入框
        searchTagInput.value = ''; // 清空标签搜索框
    });

    // 按标签搜索按钮事件监听器
    searchByTagButton.addEventListener('click', () => {
        const tagToSearch = searchTagInput.value.trim();
        if (tagToSearch) {
            fetchAndDisplayImages('', tagToSearch); // 按标签搜索时，不指定文件夹
        } else {
            alert('请输入要搜索的标签。');
        }
    });

    // 清除标签搜索按钮事件监听器
    clearTagSearchButton.addEventListener('click', () => {
        searchTagInput.value = ''; // 清空标签输入框
        fetchAndDisplayImages(''); // 重新加载所有图片（不带文件夹和标签过滤）
    });

    // 页面加载时获取并显示图片
    fetchAndDisplayImages(); // 默认加载所有上传图片
});
