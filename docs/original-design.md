最初想法：
* 能够批量的快速清理项目的临时目录/文件，如node项目中的，node_modules、dist、build, rust项目中的target目录等

产品设计:
* 使用rust来提供cli命令行，命令支持多个option，和多个搜索路径，大概的执行的格式如`bc <option1> <option2> [folder1] [folder2]`
* 支持常见的option，如dry-run，debug，interactive，verbose，quiet，help，version，etc等
* 通过--clean-folder, --clean-file来指定清理的目录和文件,也通过--config来支持配置文件，可以配置清理的目录，文件，程序有默认的配置
* 清理完后，提供清理报告

* 提供npm包，用于在node项目中调用

* 提供raycast插件，用于快速清理

开发设计
* rust提供core + cli，node版本调用rust接口，对外提供api。
* monorepo结构，cargo和pnpm来管理。
* 开发文档和使用文档完善
* 测试用例完善
* 利用github action来实现自动化测试和发布
