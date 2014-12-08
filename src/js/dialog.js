/**
 * 基于jquery的Dialog插件
 *
 * author    wlkkn <https://github.com/wlkkn>
 * version    0.0.1
 * browser    IE8+
 *
 * @param [object] content(弹出框内容)
 * @param [object] options(弹出框选项)
*/
;(function($, window, document, undefined) {
  var Dialog = function(content, opts){
    this.defaults = {
      title: '标题',//标题文本，传空则不显示
      showTitle: true,//是否显示标题栏
      closeText: '',//关闭按钮文本
      btnConfirm: '确定',//确定按钮文本
      btnCancel: '取消',//取消按钮文本
      showBtns: true,//是否显示按钮组
      showBtnConfirm: true,//显示确定按钮
      showBtnCancel: true,//显示取消按钮
      draggable: true,//是否支持拖动
      modal: true,//是否模态对话框
      center: true,//是否居中
      fixed: true,//是否跟随页面滚动
      time: 0,//自动关闭时间
      id: false//对话框id，若为false，则由系统自动产生一个唯一的id
    };
    var options = $.extend({}, this.defaults, opts);
    options.id = options.id ? options.id : 'knDialog-' + Dialog.__count;//弹出层ID
    var layerMaskId = options.id + '-overlay'; //遮罩层ID
    var timeId = null; //自动关闭计时器
    var isShow = false;
    // ie
    var isIe = !!window.ActiveXObject;
    var isIe6 = isIe&&!window.XMLHttpRequest;
    // dialog的布局及标题位置
    var titleHtml = !options.showTitle ? '' : '<div class="bar"><span class="title">' + options.title + '</span><span class="close">' + options.closeText + '</span></div>';
    var btnConfirmHtml = !options.showBtnConfirm ? '' : '<div class="btn confirm">' + options.btnConfirm + '</div>';
    var btnCancelHtml = !options.showBtnCancel ? '' : '<div class="btn cancel disabled">' + options.btnCancel + '</div>';
    var btnsHtml = !options.showBtns ? '' : '<div class="btns">' + btnConfirmHtml + btnCancelHtml + '</div>';
    var dialogBody = $('<div id="' + options.id + '" class="dialog">'+ titleHtml + '<div class="container"><div class="content"></div>'+btnsHtml+'</div></div>').hide();
    $('body').append(dialogBody);

    /**
     * 重置对话框的位置
     *
     * 在需要居中时调用，每次加载完内容后重新定位
     *
    */
    this.resetDia = function(){
      if(options.center){
        var left = ($(window).width() - dialogBody.width()) / 2;
        var top = ($(window).height() - dialogBody.height()) / 2;
        if(!isIe6 && options.fixed){
          dialogBody.css({'top': top, left: left});
        }else{
          dialogBody.css({top: top+$(document).scrollTop(), left: left+$(document).scrollLeft()});
        }
      }
    };

    /**
     * 初始化位置及部分事件
     *
     *
    */
    var init = function(){
      // 是否需要遮罩层
      if(options.modal){
        $('body').append('<div id="' + layerMaskId + '" class="dialog-layerMask"></div>');
        $('#' + layerMaskId).css({
          left: 0,
          top: 0,
          width: '100%',
          height: $(document).height(),
          'z-index': ++Dialog.__zindex,
          position: 'absolute'
        });
      }
      // 弹出层样式
      dialogBody.css({'z-index': ++Dialog.__zindex, 'position': options.fixed ? 'fixed' : 'absolute'});
      // IE6兼容fixed
      if(isIe6 && options.fixed){
        dialogBody.css('position','absolute');
        this.resetDia();
        var top = parseInt(dialogBody.css('top')) - $(document).scrollTop();
        var left = parseInt(dialogBody.css('left')) - $(document).scrollLeft();
        $(window).scroll(function(){
          dialogBody.css({'top': $(document).scrollTop() + top,'left':$(document).scrollLeft()+left});
        });
      }
      // 弹出框是否可以移动
      var mouse = {x:0,y:0};
      function moveDialog(event){
        var e = window.event || event;
        var top = parseInt(dialogBody.css('top')) + (e.clientY - mouse.y);
        var left = parseInt(dialogBody.css('left')) + (e.clientX - mouse.x);
        dialogBody.css({top: top, left: left});
        mouse.x = e.clientX;
        mouse.y = e.clientY;
      }
      var opt = options;
      dialogBody.find('.bar').on('mousedown', function(event){
        if(!opt.draggable){ return;}

        var e = window.event || e;
        mouse.x = e.clientX;
        mouse.y = e.clientY;
        dialogBody.css('cursor','move');
        $(document).bind('mousemove', moveDialog);
      });
      $(document).mouseup(function(event){
        $(document).unbind('mousemove', moveDialog);
        dialogBody.css('cursor','default');
      });

      // 绑定事件
      dialogBody.find('.close').bind('click', this.close);
      dialogBody.find('.cancel').bind('click', this.close);
      dialogBody.bind('mousedown', function(){
        $(this).css('z-index',++Dialog.__zindex);
      });

      // 自动关闭
      if(0 !== options.time){
        timeId = setTimeout(this.close, options.time);
      }
    };

    /**
     * 设置对话框内容
    */
    this.setConent = function(c){
      var div = dialogBody.find('.content');
      if('object' === typeof(c)){
        switch(c.type.toLowerCase()){
          case 'id':
            div.html($('#'+ c.value).html());
            break;
          case 'img':
            div.html('加载中...');
            $('<img alt="" />').load(function(){
              div.empty().append($(this));this.resetDia();
            }).attr('src', c.value);
            break;
          case 'url':
            div.html('加载中...');
            $.ajax({
              url: c.value,
              success: function(data){
                div.html(data);
                this.resetDia();
              },
              error: function(data,status,error){
                div.html('出错啦！');
              }
            });
            break;
          case 'iframe':
            div.append($('<iframe src="'+c.value+'" />'));
            break;
          case 'text':
            div.html(c.value);
            break;
          default:
            div.html(c.value);
            break;
        }
      }else{
        div.html(c);
      }
    };

    /**
     *显示对话框
    */
    this.show = function(){
      // 显示弹出框前回调事件beforeShow后如果存在则调用
      if(undefined !== options.beforeShow && options.beforeShow){
        options.beforeShow();
      }

      //  获取元素透明度
      var getOpacity = function(id){
        if(!isIe){
          return $('#' + id).css('opacity');
        }
        var el = document.getElementById(id);
        return (undefined !== el && undefined !== el.filters && undefined !== el.filters.alpha && undefined !== el.filters.alpha.opacity) ? el.filters.alpha.opacity / 100 : 1;
      };
      // 是否显示遮罩层
      if(options.modal){
        $('#' + layerMaskId).fadeTo('slow', getOpacity(layerMaskId));
      }
      dialogBody.fadeTo('slow', getOpacity(options.id),function(){
        // 显示弹出框后回调事件后beforeHide如果存在则调用
        if(undefined !== options.afterShow){
          options.afterShow();
        }
        isShow = true;
      });
      // 自动关闭
      if(0 !== options.time){
        timeId = setTimeout(this.close,options.time);
      }

      this.resetDia();
    };

    /**
     * 隐藏对话框，但并不取消窗口内容
    */
    this.hide = function(){
      if(!isShow){return;}

      // 隐藏弹出框前回调事件后beforeHide如果存在则调用
      if(undefined !== options.beforeHide && options.beforeHide){options.beforeHide();}

      dialogBody.fadeOut('slow',function(){
        // 隐藏弹出框后回调事件后afterHide如果存在则调用
        if(undefined !== options.afterHide){
          options.afterHide();
        }
      });
      if(options.modal){
        $('#' + layerMaskId).fadeOut('slow');
      }

      isShow = false;
    };

    /**
     * 关闭弹出框
    */
    this.close = function(){
      // 关闭弹出框前回调事件beforeClose如果存在则调用
      if(undefined !== options.beforeClose && options.beforeClose){options.beforeClose();}
      dialogBody.fadeOut('slow', function(){
        $(this).remove();
        isShow = false;
        // 关闭弹出框后回调事件后afterClose如果存在则调用
        if(undefined !== options.afterClose){
          options.afterClose();
        }
      });
      if(options.modal){
        $('#'+layerMaskId).fadeOut('slow', function(){
          $(this).remove();
        });
      }
      clearTimeout(timeId);
    };

    init.call(this);
    this.setConent(content);

    Dialog.__count++;
    Dialog.__zindex++;
  };
  Dialog.__zindex = 999;
  Dialog.__count = 1;
  Dialog.prototype = {
    test: function(){
      return console.dir(options);
    }
  };
  $.fn.knDialog = function(content, options) {
    var dialog = new Dialog(content, options);
    return dialog.show();
  };
})(jQuery, window, document);