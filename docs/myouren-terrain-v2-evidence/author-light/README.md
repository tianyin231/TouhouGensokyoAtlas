# 两次作者轻检的准确来源

两次均为实际执行，stdout/stderr保持原字节。共用执行脚本prepare.executed.mjs；源／脚本／输出SHA与CLI结果见manifest.json。run-02源与project对应本提交根目录。restore-run-01.patch是从两份已保存的准确执行时快照生成的逆向差异，可从本提交源码恢复run-01（29efdc83）；它不是执行前已有的文件。没有为归档重新prepare或跑GPU。

run-01原CLI1的边界登记问题由实际源码修复后，run-02短检CLI0。两者不代替独立V2的14/16原CLI1或后续真实cut开缝诊断。实图仍拒收，不继续本方法。
