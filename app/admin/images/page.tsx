const deleteImage = async (id: string) => {
  const confirmDelete = confirm("确定要删除这张图片吗？");
  if (!confirmDelete) return;

  const { error } = await supabase.from('images').delete().eq('id', id);
  if (error) alert(error.message);
  else location.reload(); // 简单粗暴的刷新
};

// 在你的渲染代码里：
<button onClick={() => deleteImage(img.id)} className="bg-red-500 text-white p-2 rounded">Delete</button>